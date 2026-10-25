const { z } = require('zod/v4');
const id = z.string().min(1).max(100);
const ids = z.array(id).min(1).max(1000);
const number = z.number().finite();
const position = number.min(-16384).max(32768);
const dimension = number.min(1).max(16384);
const color = z.string().regex(/^(?:#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|transparent)$/i);
const nodeType = z.enum(['frame', 'text', 'button', 'ellipse', 'image', 'group', 'line', 'polygon', 'vector']);
const node = z.object({
  id, name: z.string().max(200), type: nodeType, x: position, y: position, width: dimension, height: dimension,
  fill: color, color, text: z.string().max(5000), fontSize: number.min(1).max(1024), fontWeight: number.min(100).max(900),
  radius: number.min(0).max(8192), opacity: number.min(0).max(1), rotation: number.min(-360).max(360), blur: number.min(0).max(100),
  glass: z.boolean(), shadow: z.boolean(), visible: z.boolean(), locked: z.boolean(),
  animation: z.enum(['none', 'float', 'pulse', 'fade', 'slide']), duration: number.min(0.1).max(120),
  image: z.string().max(1_500_000).regex(/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i), parentId: id,
  fillType: z.enum(['solid', 'linear']), gradient: z.object({ from: color, to: color, angle: position }).strict(),
  stroke: color, strokeWidth: number.min(0).max(200), cornerRadii: z.tuple([number.min(0).max(8192), number.min(0).max(8192), number.min(0).max(8192), number.min(0).max(8192)]),
  fontFamily: z.string().max(160).regex(/^[\p{L}\p{N} _,.-]+$/u), lineHeight: number.min(0.5).max(5), letterSpacing: number.min(-20).max(100),
  textAlign: z.enum(['left', 'center', 'right']), verticalAlign: z.enum(['top', 'center', 'bottom']),
  shadowX: position, shadowY: position, shadowBlur: number.min(0).max(300), shadowColor: color,
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']), clipContent: z.boolean(),
  layout: z.object({ direction: z.enum(['none', 'horizontal', 'vertical']), gap: number.min(0).max(2048), padding: number.min(0).max(2048), align: z.enum(['start', 'center', 'end']), justify: z.enum(['start', 'center', 'end', 'space-between']) }).strict(),
  sizing: z.object({ horizontal: z.enum(['fixed', 'fill', 'hug']), vertical: z.enum(['fixed', 'fill', 'hug']) }).strict(),
  constraints: z.object({ horizontal: z.enum(['left', 'right', 'center', 'stretch']), vertical: z.enum(['top', 'bottom', 'center', 'stretch']) }).strict(),
  vectorPath: z.string().max(20000), componentRole: z.enum(['master', 'instance']), componentId: id, componentSourceId: id,
  overrides: z.array(z.string().max(100)).max(100),
  keyframes: z.array(z.object({ time: number.min(0).max(120), x: position.optional(), y: position.optional(), rotation: number.min(-360).max(360).optional(), scale: number.min(0.01).max(100).optional(), opacity: number.min(0).max(1).optional() }).strict()).max(200),
  easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']), delay: number.min(0).max(120), scale: number.min(0.01).max(100),
  interaction: z.object({ trigger: z.enum(['click', 'hover']), action: z.enum(['navigate', 'overlay', 'close']), targetPageId: id.optional(), transition: z.enum(['instant', 'fade', 'slide']), duration: number.min(0).max(20) }).strict(),
}).partial().strict();
const operation = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), node: node.extend({ type: nodeType }), parentId: id.optional() }).strict(),
  z.object({ type: z.literal('update'), ids, patch: node }).strict(),
  z.object({ type: z.literal('delete'), ids }).strict(),
  z.object({ type: z.literal('duplicate'), ids, offset: z.object({ x: position, y: position }).strict().optional() }).strict(),
  z.object({ type: z.literal('reparent'), ids, parentId: id.optional() }).strict(),
  z.object({ type: z.literal('group'), ids, name: z.string().max(200).optional() }).strict(),
  z.object({ type: z.literal('ungroup'), ids }).strict(),
  z.object({ type: z.literal('align'), ids, axis: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom']) }).strict(),
  z.object({ type: z.literal('distribute'), ids, axis: z.enum(['horizontal', 'vertical']) }).strict(),
  z.object({ type: z.literal('reorder'), ids, direction: z.enum(['front', 'back', 'forward', 'backward']) }).strict(),
  z.object({ type: z.literal('component'), ids, name: z.string().max(200).optional() }).strict(),
  z.object({ type: z.literal('instantiate'), masterId: id, x: position.optional(), y: position.optional() }).strict(),
  z.object({ type: z.literal('resize_page'), width: dimension, height: dimension }).strict(),
  z.object({ type: z.literal('token_update'), name: z.string().min(1).max(100), value: color }).strict(),
]);
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional();
const pageId = id.optional();
const schemas = {
  get_document: z.object({ detail: z.enum(['summary', 'full']).default('summary') }).strict(),
  get_nodes: z.object({ pageId, nodeIds: z.array(id).max(1000).optional() }).strict(),
  list_templates: z.object({}).strict(),
  create_page: z.object({ kind: z.enum(['mobile', 'web', 'slide', 'desktop', 'banner']), presetId: id.optional(), name: z.string().max(200).optional(), width: dimension.optional(), height: dimension.optional(), expectedRevision: revision }).strict(),
  batch_edit: z.object({ pageId, operations: z.array(operation).min(1).max(100), expectedRevision: revision }).strict(),
  set_selection: z.object({ pageId, nodeIds: z.array(id).max(1000) }).strict(),
  undo: z.object({}).strict(), redo: z.object({}).strict(),
  export_code: z.object({ pageId, format: z.enum(['html', 'react', 'xml', 'compose', 'svg', 'json', 'xaml']) }).strict(),
  render: z.object({ pageId, scale: number.min(0.1).max(2).default(1), time: number.min(0).max(120).optional() }).strict(),
  set_viewport: z.object({ zoom: number.min(0.05).max(4).optional(), fit: z.boolean().optional() }).strict(),
};
const writeCommands = new Set(['create_page', 'batch_edit', 'undo', 'redo']);
function validateCommand(command, args) {
  if (!Object.hasOwn(schemas, command)) throw new Error('UNKNOWN_COMMAND: This command is not available.');
  if (args !== undefined && (!args || Array.isArray(args) || typeof args !== 'object')) throw new Error('INVALID_ARGUMENTS: arguments must be a JSON object.');
  const result = schemas[command].safeParse(args ?? {});
  if (!result.success) throw new Error(`INVALID_ARGUMENTS: ${result.error.issues.slice(0, 4).map(i => `${i.path.join('.') || 'arguments'} ${i.message}`).join('; ')}`);
  return result.data;
}
module.exports = { z, schemas, writeCommands, validateCommand };
