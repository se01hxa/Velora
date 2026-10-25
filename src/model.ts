import {validArtboardSize} from './artboard-size';
import {normalizeGradient} from './paint';
import type { DesignNode, DesignPage, DesignProject, DesignOperation, NodeType, NodeKeyframe } from './types';

const TYPES: NodeType[] = ['frame', 'text', 'button', 'ellipse', 'image', 'group', 'line', 'polygon', 'vector'];
const clone = <T>(value: T): T => structuredClone(value);
const number = (v: unknown, fallback: number, min = -8192, max = 8192): number => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const text = (v: unknown, fallback = '', max = 5000): string => typeof v === 'string' ? v.slice(0, max) : fallback;
const choice = <const T extends string>(v: unknown, values: readonly T[], fallback: T): T => values.includes(v as T) ? v as T : fallback;
const color = (v: unknown, fallback: string): string => typeof v === 'string' && /^(?:#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|transparent)$/i.test(v) ? v.toLowerCase() : fallback;
const uuid = (): string => crypto.randomUUID();

/** A complete node factory, also used to sanitize patches entering through the local API. */
export function normalizeNode(type: NodeType, overrides: Partial<DesignNode> = {}): DesignNode {
  if (!TYPES.includes(type)) throw new Error('지원하지 않는 요소 종류입니다.');
  const n = overrides;
  const result: DesignNode = {
    id: text(n.id, '', 100) || uuid(), type, name: text(n.name, type === 'group' ? '그룹' : type === 'text' ? '텍스트' : type === 'button' ? '버튼' : '요소', 200),
    x: number(n.x, 32, -16384, 32768), y: number(n.y, 32, -16384, 32768), width: number(n.width, type === 'text' ? 200 : 160, 1, 16384), height: number(n.height, type === 'text' ? 36 : type === 'button' ? 48 : type === 'line' ? 2 : 120, 1, 16384),
    fill: color(n.fill, type === 'text' || type === 'group' || type === 'line' ? 'transparent' : '#d8f5d0'), color: color(n.color, '#172424'), text: text(n.text, type === 'text' ? '새로운 아이디어' : type === 'button' ? 'Get started' : ''),
    fontSize: number(n.fontSize, 18, 1, 1024), fontWeight: number(n.fontWeight, 500, 100, 900), radius: number(n.radius, type === 'ellipse' ? 999 : type === 'text' || type === 'line' ? 0 : 24, 0, 8192),
    opacity: number(n.opacity, 1, 0, 1), rotation: number(n.rotation, 0, -360, 360), blur: number(n.blur, 0, 0, 100), glass: n.glass === true, shadow: n.shadow === true, visible: n.visible !== false, locked: n.locked === true,
    animation: choice(n.animation, ['none', 'float', 'pulse', 'fade', 'slide'], 'none'), duration: number(n.duration, 2, .1, 120),
    fillType: choice(n.fillType, ['solid', 'linear', 'radial'], 'solid'), stroke: color(n.stroke, type === 'line' ? '#172424' : 'transparent'), strokeWidth: number(n.strokeWidth, type === 'line' ? 2 : 0, 0, 200),
    fontFamily: text(n.fontFamily, 'Segoe UI', 160), lineHeight: number(n.lineHeight, 1.2, .5, 5), letterSpacing: number(n.letterSpacing, 0, -20, 100),
    textAlign: choice(n.textAlign, ['left', 'center', 'right'], type === 'button' ? 'center' : 'left'), verticalAlign: choice(n.verticalAlign, ['top', 'center', 'bottom'], type === 'button' ? 'center' : 'top'),
    shadowX: number(n.shadowX, 0, -2048, 2048), shadowY: number(n.shadowY, 12, -2048, 2048), shadowBlur: number(n.shadowBlur, 30, 0, 300), shadowColor: color(n.shadowColor, '#00000020'),
    blendMode: choice(n.blendMode, ['normal', 'multiply', 'screen', 'overlay'], 'normal'), clipContent: n.clipContent === true,
    layout: { direction: choice(n.layout?.direction, ['none', 'horizontal', 'vertical'], 'none'), gap: number(n.layout?.gap, 12, 0, 2048), padding: number(n.layout?.padding, 0, 0, 2048), align: choice(n.layout?.align, ['start', 'center', 'end'], 'start'), justify: choice(n.layout?.justify, ['start', 'center', 'end', 'space-between'], 'start') },
    sizing: { horizontal: choice(n.sizing?.horizontal, ['fixed', 'fill', 'hug'], 'fixed'), vertical: choice(n.sizing?.vertical, ['fixed', 'fill', 'hug'], 'fixed') },
    constraints: { horizontal: choice(n.constraints?.horizontal, ['left', 'right', 'center', 'stretch'], 'left'), vertical: choice(n.constraints?.vertical, ['top', 'bottom', 'center', 'stretch'], 'top') },
    easing: choice(n.easing, ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'], 'ease-in-out'), delay: number(n.delay, 0, 0, 120),
  };
  if (typeof n.parentId === 'string' && n.parentId) result.parentId = n.parentId.slice(0, 100);
  if (typeof n.image === 'string' && n.image.length < 14_000_000 && /^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/]+={0,2}$/i.test(n.image)) result.image = n.image;
  if (n.gradient) result.gradient = normalizeGradient(n.gradient);
  if(n.strokeDash)result.strokeDash=n.strokeDash.slice(0,8).map(v=>number(v,4,.1,1000));
  result.strokeCap=choice(n.strokeCap,['butt','round','square'],'butt');
  result.fontStyle=choice(n.fontStyle,['normal','italic'],'normal');result.textDecoration=choice(n.textDecoration,['none','underline','line-through'],'none');
  if (Array.isArray(n.cornerRadii) && n.cornerRadii.length === 4) result.cornerRadii = n.cornerRadii.map(v => number(v, result.radius, 0, 8192)) as [number, number, number, number];
  if (typeof n.vectorPath === 'string' && n.vectorPath.length <= 20000 && /^[\s\dMmLlHhVvCcSsQqTtAaZzEe+.,-]*$/.test(n.vectorPath)) result.vectorPath = n.vectorPath;
  if (n.componentRole === 'master' || n.componentRole === 'instance') result.componentRole = n.componentRole;
  if (typeof n.componentId === 'string') result.componentId = n.componentId.slice(0, 100);
  if (typeof n.componentSourceId === 'string') result.componentSourceId = n.componentSourceId.slice(0, 100);
  if (Array.isArray(n.overrides)) result.overrides = [...new Set(n.overrides.filter(v => typeof v === 'string').map(v => v.slice(0, 200)))].slice(0, 1000);
  if (Array.isArray(n.keyframes)) {
    const times = new Map<number, NodeKeyframe>();
    for (const f of n.keyframes.slice(0, 1000)) {
      if (!f || typeof f.time !== 'number' || !Number.isFinite(f.time)) continue;
      const k: NodeKeyframe = { time: number(f.time, 0, 0, 120) };
      for (const property of ['x', 'y', 'rotation', 'scale', 'opacity'] as const) {
        if (typeof f[property] === 'number' && Number.isFinite(f[property])) k[property] = number(f[property], 0, property === 'opacity' ? 0 : property === 'scale' ? .01 : -8192, property === 'opacity' ? 1 : property === 'scale' ? 100 : 8192);
      }
      times.set(k.time, k);
    }
    result.keyframes = [...times.values()].sort((a, b) => a.time - b.time);
  }
  if (n.scale !== undefined) result.scale = number(n.scale, 1, .01, 100);
  if (n.interaction) result.interaction = { trigger: choice(n.interaction.trigger, ['click', 'hover'], 'click'), action: choice(n.interaction.action, ['navigate', 'overlay', 'close'], 'navigate'), transition: choice(n.interaction.transition, ['instant', 'fade', 'slide'], 'instant'), duration: number(n.interaction.duration, .3, 0, 10), ...(typeof n.interaction.targetPageId === 'string' ? { targetPageId: n.interaction.targetPageId.slice(0, 100) } : {}) };
  return result;
}

export function getChildren(page: DesignPage, parentId?: string): DesignNode[] { return page.nodes.filter(n => (n.parentId || undefined) === (parentId || undefined)); }
export function getRoots(page: DesignPage): DesignNode[] { return getChildren(page); }
export function descendants(page: DesignPage, ids: string[]): string[] {
  const found = new Set(ids.filter(id => page.nodes.some(n => n.id === id)));
  let changed = true;
  while (changed) { changed = false; for (const n of page.nodes) if (n.parentId && found.has(n.parentId) && !found.has(n.id)) { found.add(n.id); changed = true; } }
  return page.nodes.filter(n => found.has(n.id)).map(n => n.id);
}
function assertTree(page: DesignPage): void {
  if (!Array.isArray(page.nodes) || page.nodes.length > 1000) throw new Error('페이지당 요소는 최대 1,000개입니다.');
  const nodes = new Map<string, DesignNode>();
  for (const n of page.nodes) { if (!n.id || nodes.has(n.id) || !TYPES.includes(n.type)) throw new Error('요소 ID 또는 종류가 올바르지 않습니다.'); nodes.set(n.id, n); }
  const completed = new Set<string>();
  for (const n of page.nodes) {
    const path = new Set<string>(); let next: DesignNode | undefined = n;
    while (next && !completed.has(next.id)) {
      if (path.has(next.id)) throw new Error('부모 관계에 순환이 있습니다.');
      path.add(next.id);
      if (next.parentId && !nodes.has(next.parentId)) throw new Error('부모 요소를 찾을 수 없습니다.');
      next = next.parentId ? nodes.get(next.parentId) : undefined;
    }
    path.forEach(id => completed.add(id));
  }
}
function selectedRoots(page: DesignPage, ids: string[], strict = true): DesignNode[] {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new Error('요소 ID 목록이 올바르지 않습니다.');
  const set = new Set(ids); const map = new Map(page.nodes.map(n => [n.id, n]));
  if (strict && [...set].some(id => !map.has(id))) throw new Error('선택한 요소를 찾을 수 없습니다.');
  return page.nodes.filter(n => { if (!set.has(n.id)) return false; let p = n.parentId; while (p) { if (set.has(p)) return false; p = map.get(p)?.parentId; } return true; });
}

type Matrix = [number, number, number, number, number, number];
interface World { matrix: Matrix; rotation: number; scale: number; opacity: number; visible: boolean; cx: number; cy: number; }
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (a: Matrix, b: Matrix): Matrix => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const point = (m: Matrix, x: number, y: number): { x: number; y: number } => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
function inverse(m: Matrix): Matrix { const det = m[0] * m[3] - m[1] * m[2]; if (Math.abs(det) < 1e-12) throw new Error('요소 변환을 계산할 수 없습니다.'); return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det]; }
function worlds(page: DesignPage): Map<string, World> {
  const map = new Map(page.nodes.map(n => [n.id, n])); const result = new Map<string, World>();
  const visit = (node: DesignNode): World => {
    const found = result.get(node.id); if (found) return found;
    const parent = node.parentId ? visit(map.get(node.parentId)!) : undefined;
    const scale = node.scale ?? 1, rad = node.rotation * Math.PI / 180, c = Math.cos(rad) * scale, s = Math.sin(rad) * scale;
    const local: Matrix = [c, s, -s, c, node.x + node.width / 2 - c * node.width / 2 + s * node.height / 2, node.y + node.height / 2 - s * node.width / 2 - c * node.height / 2];
    const matrix = multiply(parent?.matrix ?? IDENTITY, local); const center = point(matrix, node.width / 2, node.height / 2);
    const world = { matrix, rotation: (parent?.rotation ?? 0) + node.rotation, scale: (parent?.scale ?? 1) * scale, opacity: (parent?.opacity ?? 1) * node.opacity, visible: (parent?.visible ?? true) && node.visible, cx: center.x, cy: center.y };
    result.set(node.id, world); return world;
  };
  page.nodes.forEach(visit); return result;
}

function layoutPage(page: DesignPage): void {
  const byParent = new Map<string | undefined, DesignNode[]>();
  for (const n of page.nodes) { const key = n.parentId || undefined; const list = byParent.get(key) ?? []; list.push(n); byParent.set(key, list); }
  const descendantsFirst: DesignNode[] = [];
  const walk = (n: DesignNode) => { for (const child of byParent.get(n.id) ?? []) walk(child); descendantsFirst.push(n); };
  for (const root of byParent.get(undefined) ?? []) walk(root);
  const size = (n: DesignNode, axis: 'width' | 'height', value: number) => { n[axis] = Math.max(1, Math.min(16384, value)); };
  // Bottom-up hug and top-down fill converge in a bounded number of deterministic passes.
  for (let pass = 0; pass < 4; pass++) {
    for (const n of descendantsFirst) {
      const children = (byParent.get(n.id) ?? []).filter(c => c.visible), p = n.layout?.padding ?? 0, gap = n.layout?.gap ?? 0, direction = n.layout?.direction ?? 'none';
      if (children.length) {
        if (n.sizing?.horizontal === 'hug') size(n, 'width', 2 * p + (direction === 'horizontal' ? children.reduce((s, c) => s + c.width, 0) + gap * (children.length - 1) : direction === 'vertical' ? Math.max(...children.map(c => c.width)) : Math.max(0, ...children.map(c => c.x + c.width))));
        if (n.sizing?.vertical === 'hug') size(n, 'height', 2 * p + (direction === 'vertical' ? children.reduce((s, c) => s + c.height, 0) + gap * (children.length - 1) : direction === 'horizontal' ? Math.max(...children.map(c => c.height)) : Math.max(0, ...children.map(c => c.y + c.height))));
      } else if (n.type === 'text' || n.type === 'button') {
        const lines = n.text.split('\n');
        if (n.sizing?.horizontal === 'hug') size(n, 'width', 2 * p + Math.max(1, ...lines.map(line => [...line].length * n.fontSize * .55 + Math.max(0, [...line].length - 1) * (n.letterSpacing ?? 0))));
        if (n.sizing?.vertical === 'hug') size(n, 'height', 2 * p + Math.max(1, lines.length) * n.fontSize * (n.lineHeight ?? 1.2));
      }
    }
    for (const n of [...descendantsFirst].reverse()) {
      const children = (byParent.get(n.id) ?? []).filter(c => c.visible), layout = n.layout;
      if (!layout || layout.direction === 'none' || !children.length) continue;
      const horizontal = layout.direction === 'horizontal', main = horizontal ? 'width' : 'height', cross = horizontal ? 'height' : 'width', mainSizing = horizontal ? 'horizontal' : 'vertical', crossSizing = horizontal ? 'vertical' : 'horizontal';
      const available = Math.max(0, n[main] - 2 * layout.padding), innerCross = Math.max(1, n[cross] - 2 * layout.padding);
      const fills = children.filter(c => c.sizing?.[mainSizing] === 'fill');
      const fixed = children.filter(c => c.sizing?.[mainSizing] !== 'fill').reduce((sum, c) => sum + c[main], 0);
      if (n.sizing?.[mainSizing] !== 'hug' && fills.length) for (const c of fills) size(c, main, (available - fixed - layout.gap * (children.length - 1)) / fills.length);
      for (const c of children) if (c.sizing?.[crossSizing] === 'fill') size(c, cross, innerCross);
      const used = children.reduce((sum, c) => sum + c[main], 0) + layout.gap * (children.length - 1), free = Math.max(0, available - used);
      const gap = layout.gap + (layout.justify === 'space-between' && children.length > 1 ? free / (children.length - 1) : 0);
      let cursor = layout.padding + (layout.justify === 'center' ? free / 2 : layout.justify === 'end' ? free : 0);
      for (const c of children) {
        const crossPosition = layout.padding + (layout.align === 'center' ? (innerCross - c[cross]) / 2 : layout.align === 'end' ? innerCross - c[cross] : 0);
        if (horizontal) { c.x = cursor; c.y = crossPosition; } else { c.y = cursor; c.x = crossPosition; }
        cursor += c[main] + gap;
      }
    }
  }
}
function eased(t: number, kind: DesignNode['easing']): number {
  if (kind === 'linear') return t;
  if (kind === 'ease-in') return t * t;
  if (kind === 'ease-out') return 1 - (1 - t) * (1 - t);
  return t * t * (3 - 2 * t);
}
function sampleNode(n: DesignNode, time: number): void {
  const t = time - (n.delay ?? 0); if (t < 0) return;
  for (const property of ['x', 'y', 'rotation', 'scale', 'opacity'] as const) {
    const start = n[property] ?? (property === 'scale' ? 1 : 0);
    const frames = [{ time: 0, value: start }, ...(n.keyframes ?? []).filter(f => f[property] !== undefined).map(f => ({ time: f.time, value: f[property]! }))].sort((a, b) => a.time - b.time);
    let a = frames[0], b = frames[frames.length - 1];
    for (const frame of frames) { if (frame.time <= t) a = frame; else { b = frame; break; } }
    const progress = b.time > a.time ? eased(Math.max(0, Math.min(1, (t - a.time) / (b.time - a.time))), n.easing) : 0;
    n[property] = a.value + (b.value - a.value) * progress;
  }
  const wave = .5 - .5 * Math.cos(2 * Math.PI * ((t % n.duration) / n.duration));
  if (n.animation === 'float') n.y -= 10 * wave;
  if (n.animation === 'slide') n.x += 16 * wave;
  if (n.animation === 'pulse') n.scale = (n.scale ?? 1) * (1 + .045 * wave);
  if (n.animation === 'fade') n.opacity *= 1 - .65 * wave;
}
/** Resolve auto-layout and optional animation while retaining local parent-relative coordinates. */
export function resolvePage(page: DesignPage, time?: number): DesignPage {
  const result = clone(page); result.nodes = result.nodes.map(n => normalizeNode(n.type, n)); assertTree(result); layoutPage(result);
  if (typeof time === 'number' && Number.isFinite(time)) result.nodes.forEach(n => sampleNode(n, Math.max(0, time)));
  return result;
}
/** Absolute frames; effective scale is baked into width/height and reset to 1. */
export function flattenPage(page: DesignPage, time?: number): DesignPage {
  const result = resolvePage(page, time), transforms = worlds(result);
  result.nodes = result.nodes.map(n => { const w = transforms.get(n.id)!; const width = n.width * w.scale, height = n.height * w.scale; return { ...n, x: w.cx - width / 2, y: w.cy - height / 2, width, height, rotation: w.rotation, scale: 1, opacity: w.opacity, visible: w.visible }; });
  return result;
}
export interface SelectionBounds { x: number; y: number; width: number; height: number; }
export function selectionBounds(page: DesignPage, ids: string[]): SelectionBounds | null {
  const set = new Set(ids), nodes = flattenPage(page).nodes.filter(n => set.has(n.id)); if (!nodes.length) return null;
  const x = Math.min(...nodes.map(n => n.x)), y = Math.min(...nodes.map(n => n.y));
  return { x, y, width: Math.max(...nodes.map(n => n.x + n.width)) - x, height: Math.max(...nodes.map(n => n.y + n.height)) - y };
}

function placeWorld(page: DesignPage, n: DesignNode, world: Pick<World, 'cx' | 'cy'>, rotation?: number, scale?: number): void {
  const map = worlds(page), parent = n.parentId ? map.get(n.parentId) : undefined;
  const local = point(inverse(parent?.matrix ?? IDENTITY), world.cx, world.cy);
  n.x = local.x - n.width / 2; n.y = local.y - n.height / 2;
  if (rotation !== undefined) n.rotation = ((rotation - (parent?.rotation ?? 0) + 180) % 360 + 360) % 360 - 180;
  if (scale !== undefined) n.scale = scale / (parent?.scale ?? 1);
}
function resizeChildren(page: DesignPage, parentId: string | undefined, oldWidth: number, oldHeight: number, width: number, height: number): void {
  const parent = page.nodes.find(n => n.id === parentId);
  if (parent?.layout?.direction && parent.layout.direction !== 'none') return;
  const dx = width - oldWidth, dy = height - oldHeight;
  for (const n of getChildren(page, parentId)) {
    const oldW = n.width, oldH = n.height;
    if (n.constraints?.horizontal === 'right') n.x += dx;
    if (n.constraints?.horizontal === 'center') n.x += dx / 2;
    if (n.constraints?.horizontal === 'stretch') n.width = Math.max(1, Math.min(16384, n.width + dx));
    if (n.constraints?.vertical === 'bottom') n.y += dy;
    if (n.constraints?.vertical === 'center') n.y += dy / 2;
    if (n.constraints?.vertical === 'stretch') n.height = Math.max(1, Math.min(16384, n.height + dy));
    if (oldW !== n.width || oldH !== n.height) resizeChildren(page, n.id, oldW, oldH, n.width, n.height);
  }
}
function instanceRoot(page: DesignPage, n: DesignNode): DesignNode | undefined {
  const map = new Map(page.nodes.map(node => [node.id, node])); let current: DesignNode | undefined = n;
  while (current) { if (current.componentRole === 'instance') return current; current = current.parentId ? map.get(current.parentId) : undefined; }
  return undefined;
}
function detach(n: DesignNode): void { delete n.componentRole; delete n.componentId; delete n.componentSourceId; delete n.overrides; }
function markDeletion(page: DesignPage, ids: string[]): void {
  const set = new Set(ids);
  for (const n of page.nodes.filter(n => set.has(n.id))) { const root = instanceRoot(page, n); if (root && !set.has(root.id) && n.componentSourceId) root.overrides = [...new Set([...(root.overrides ?? []), `deleted:${n.componentSourceId}`])]; }
}
function groupNodes(page: DesignPage, ids: string[], name?: string): DesignNode {
  const roots = selectedRoots(page, ids); if (!roots.length) throw new Error('그룹으로 묶을 요소를 선택해 주세요.');
  const map = new Map(page.nodes.map(n => [n.id, n]));
  const ancestorList = (n: DesignNode): (string | undefined)[] => { const result: (string | undefined)[] = []; let id = n.parentId; while (id) { result.push(id); id = map.get(id)?.parentId; } result.push(undefined); return result; };
  const common = ancestorList(roots[0]).find(id => roots.every(n => ancestorList(n).includes(id)));
  const transform = worlds(page), parent = common ? transform.get(common) : undefined, inv = inverse(parent?.matrix ?? IDENTITY);
  const frames = roots.map(n => { const w = transform.get(n.id)!, c = point(inv, w.cx, w.cy), scale = w.scale / (parent?.scale ?? 1); return { x: c.x - n.width * scale / 2, y: c.y - n.height * scale / 2, width: n.width * scale, height: n.height * scale }; });
  const x = Math.min(...frames.map(n => n.x)), y = Math.min(...frames.map(n => n.y));
  const group = normalizeNode('group', { name: name || '그룹', parentId: common, x, y, width: Math.max(...frames.map(n => n.x + n.width)) - x, height: Math.max(...frames.map(n => n.y + n.height)) - y, radius: 0 });
  page.nodes.splice(Math.min(...roots.map(n => page.nodes.indexOf(n))), 0, group);
  for (const n of roots) { const w = transform.get(n.id)!; n.parentId = group.id; placeWorld(page, n, w, w.rotation, w.scale); }
  return group;
}
function syncComponents(project: DesignProject): void {
  const masters = new Map<string, { page: DesignPage; root: DesignNode }>();
  for (const page of project.pages) for (const n of page.nodes) if (n.componentRole === 'master') masters.set(n.id, { page, root: n });
  const checked = new Set<string>();
  const checkDependency = (id: string, chain: Set<string>): void => {
    if (chain.has(id)) throw new Error('컴포넌트 원본 관계에 순환이 있습니다.');
    if (checked.has(id)) return;
    const master = masters.get(id); if (!master) return;
    const nextChain = new Set(chain); nextChain.add(id);
    const subtree = new Set(descendants(master.page, [id]));
    for (const n of master.page.nodes) if (subtree.has(n.id) && n.componentRole === 'instance' && n.componentId) checkDependency(n.componentId, nextChain);
    checked.add(id);
  };
  for (const id of masters.keys()) checkDependency(id, new Set());
  for (const page of project.pages) {
    for (const root of [...page.nodes].filter(n => n.componentRole === 'instance')) {
      if (!page.nodes.includes(root)) continue;
      const master = masters.get(root.componentId ?? ''); const instanceIds = new Set(descendants(page, [root.id]));
      if (!master) { for (const n of page.nodes) if (instanceIds.has(n.id)) detach(n); continue; }
      const sourceIds = descendants(master.page, [master.root.id]);
      if (sourceIds.includes(root.id)) throw new Error('컴포넌트가 자신을 포함할 수 없습니다.');
      const deleted = new Set((root.overrides ?? []).filter(s => s.startsWith('deleted:')).map(s => s.slice(8)));
      const hiddenSources = new Set(descendants(master.page, [...deleted]));
      const sources = master.page.nodes.filter(n => sourceIds.includes(n.id) && !hiddenSources.has(n.id));
      const sourceSet = new Set(sources.map(n => n.id));
      page.nodes = page.nodes.filter(n => !instanceIds.has(n.id) || n.id === root.id || !n.componentSourceId || sourceSet.has(n.componentSourceId));
      const mappings = new Map<string, DesignNode>(); mappings.set(master.root.id, root);
      for (const n of page.nodes) if (instanceIds.has(n.id) && n.componentSourceId) mappings.set(n.componentSourceId, n);
      for (const source of sources) {
        if (!mappings.has(source.id)) {
          const node = clone(source); node.id = uuid(); delete node.componentRole; node.componentId = master.root.id; node.componentSourceId = source.id; node.overrides = [];
          mappings.set(source.id, node); page.nodes.push(node);
        }
      }
      for (const source of sources) {
        const node = mappings.get(source.id)!; const keep = new Set(['id', 'componentRole', 'componentId', 'componentSourceId', 'overrides', ...(node.overrides ?? []), ...(node.id === root.id ? ['x', 'y', 'parentId'] : [])]);
        const existing = node as unknown as Record<string, unknown>, template = source as unknown as Record<string, unknown>;
        for (const key of Object.keys(existing)) if (!keep.has(key) && !(key in template)) delete existing[key];
        for (const [key, value] of Object.entries(template)) if (!keep.has(key) && key !== 'parentId') existing[key] = clone(value);
        if (node.id !== root.id && !keep.has('parentId')) node.parentId = mappings.get(source.parentId ?? master.root.id)?.id ?? root.id;
        node.componentId = master.root.id; node.componentSourceId = source.id;
      }
      const desired = sources.map(source => mappings.get(source.id)!).filter(n => n.id !== root.id);
      const desiredSet = new Set(desired.map(n => n.id)); const rootIndex = page.nodes.indexOf(root);
      page.nodes = page.nodes.filter(n => !desiredSet.has(n.id)); page.nodes.splice(rootIndex + 1, 0, ...desired);
    }
  }
}

export interface OperationResult { project: DesignProject; selectionIds: string[]; createdIds: string[]; }
/** Apply an entire batch to a clone. Any invalid operation rejects the batch without changing input. */
export function applyOperations(project: DesignProject, pageId: string, operations: DesignOperation[]): OperationResult {
  if (!Array.isArray(operations) || operations.length > 1000) throw new Error('작업 목록이 올바르지 않습니다.');
  const next = clone(project); next.pages.forEach(assertTree);
  next.pages = next.pages.map(p => resolvePage(p));
  const page = next.pages.find(p => p.id === pageId); if (!page) throw new Error('아트보드를 찾을 수 없습니다.');
  let selectionIds: string[] = [], createdIds: string[] = [];
  const addCreated = (nodes: DesignNode[]) => { createdIds.push(...nodes.map(n => n.id)); };
  for (const op of operations) {
    if (!op || typeof op !== 'object') throw new Error('작업 형식이 올바르지 않습니다.');
    // A locked ancestor protects its subtree; the lock/visibility controls remain usable.
    if ('ids' in op && !['duplicate'].includes(op.type)) {
      for (const id of op.ids) {
        let current = page.nodes.find(n => n.id === id);
        while (current) {
          const ownControl = current.id === id && op.type === 'update' &&
            (op.patch.locked === false || Object.keys(op.patch).every(k => ['locked', 'visible'].includes(k)));
          if (current.locked && !ownControl) throw new Error('잠긴 요소입니다. 먼저 잠금을 해제하세요.');
          current = current.parentId ? page.nodes.find(n => n.id === current!.parentId) : undefined;
        }
      }
    }
    switch (op.type) {
      case 'create': {
        if (!op.node || typeof op.node !== 'object') throw new Error('생성할 요소가 올바르지 않습니다.');
        const n = normalizeNode(op.node.type, { ...op.node, ...(op.parentId !== undefined ? { parentId: op.parentId } : {}) });
        if (next.pages.some(p => p.nodes.some(node => node.id === n.id))) throw new Error('요소 ID가 이미 존재합니다.');
        page.nodes.push(n); selectionIds = [n.id]; addCreated([n]); break;
      }
      case 'update': {
        selectedRoots(page, op.ids); if (!op.patch || typeof op.patch !== 'object' || Array.isArray(op.patch)) throw new Error('요소 변경 값이 올바르지 않습니다.');
        if ('id' in op.patch && op.ids.some(id => op.patch.id !== id)) throw new Error('요소 ID는 변경할 수 없습니다.');
        for (const id of new Set(op.ids)) {
          const n = page.nodes.find(n => n.id === id)!, oldWidth = n.width, oldHeight = n.height;
          const updated = normalizeNode(op.patch.type ?? n.type, { ...n, ...clone(op.patch), id: n.id });
          if (instanceRoot(page, n) && !('overrides' in op.patch)) updated.overrides = [...new Set([...(n.overrides ?? []), ...Object.keys(op.patch).filter(k => !['id', 'componentId', 'componentSourceId', 'componentRole'].includes(k))])];
          Object.keys(n).forEach(k => delete (n as unknown as Record<string, unknown>)[k]); Object.assign(n, updated);
          if (n.width !== oldWidth || n.height !== oldHeight) resizeChildren(page, n.id, oldWidth, oldHeight, n.width, n.height);
        }
        selectionIds = [...new Set(op.ids)]; break;
      }
      case 'delete': {
        selectedRoots(page, op.ids); const removed = descendants(page, op.ids); markDeletion(page, removed); const set = new Set(removed); page.nodes = page.nodes.filter(n => !set.has(n.id)); selectionIds = []; break;
      }
      case 'duplicate': {
        const roots = selectedRoots(page, op.ids), ids = new Set(descendants(page, roots.map(n => n.id))), map = new Map([...ids].map(id => [id, uuid()])), originalWorld = worlds(page), offset = { x: number(op.offset?.x, 16), y: number(op.offset?.y, 16) };
        const copies = page.nodes.filter(n => ids.has(n.id)).map(n => { const copy = clone(n); copy.id = map.get(n.id)!; if (n.parentId && map.has(n.parentId)) copy.parentId = map.get(n.parentId); return copy; });
        page.nodes.push(...copies);
        for (const n of roots) {
          const copy = copies.find(c => c.id === map.get(n.id))!, w = originalWorld.get(n.id)!;
          placeWorld(page, copy, { cx: w.cx + offset.x, cy: w.cy + offset.y }, w.rotation, w.scale);
          if (n.componentRole === 'master') for (const child of copies.filter(c => descendants(page, [copy.id]).includes(c.id))) { child.componentId = copy.id; delete child.componentSourceId; if (child.id !== copy.id) delete child.componentRole; }
          else if (instanceRoot(page, n) && n.componentRole !== 'instance') for (const child of copies.filter(c => descendants(page, [copy.id]).includes(c.id))) detach(child);
        }
        selectionIds = roots.map(n => map.get(n.id)!); addCreated(copies); break;
      }
      case 'reparent': {
        const roots = selectedRoots(page, op.ids), sub = new Set(descendants(page, roots.map(n => n.id)));
        if (op.parentId && (!page.nodes.some(n => n.id === op.parentId) || sub.has(op.parentId))) throw new Error('선택한 요소를 이 부모로 옮길 수 없습니다.');
        const before = worlds(page);
        for (const n of roots) {
          const oldInstance = instanceRoot(page, n), newInstance = op.parentId ? instanceRoot(page, page.nodes.find(node => node.id === op.parentId)!) : undefined;
          if (oldInstance && n.id !== oldInstance.id && oldInstance.id !== newInstance?.id) { markDeletion(page, descendants(page, [n.id])); for (const child of page.nodes.filter(c => descendants(page, [n.id]).includes(c.id))) detach(child); }
          n.parentId = op.parentId || undefined; const w = before.get(n.id)!; placeWorld(page, n, w, w.rotation, w.scale);
          if (oldInstance && oldInstance.id === newInstance?.id && n.id !== oldInstance.id) n.overrides = [...new Set([...(n.overrides ?? []), 'parentId', 'x', 'y', 'rotation', 'scale'])];
        }
        selectionIds = roots.map(n => n.id); break;
      }
      case 'group': { const n = groupNodes(page, op.ids, op.name); selectionIds = [n.id]; addCreated([n]); break; }
      case 'ungroup': {
        const groups = selectedRoots(page, op.ids); if (groups.some(n => n.type !== 'group')) throw new Error('그룹만 해제할 수 있습니다.');
        const before = worlds(page); const selected: string[] = [];
        for (const group of groups) { for (const child of getChildren(page, group.id)) { child.parentId = group.parentId; const w = before.get(child.id)!; placeWorld(page, child, w, w.rotation, w.scale); selected.push(child.id); } page.nodes = page.nodes.filter(n => n.id !== group.id); }
        selectionIds = selected; break;
      }
      case 'align': {
        const roots = selectedRoots(page, op.ids), bounds = selectionBounds(page, roots.map(n => n.id));
        if (!['left', 'center', 'right', 'top', 'middle', 'bottom'].includes(op.axis)) throw new Error('정렬 방향이 올바르지 않습니다.');
        if (bounds) { const before = worlds(page); for (const n of roots) { const w = before.get(n.id)!, width = n.width * w.scale, height = n.height * w.scale; let cx = w.cx, cy = w.cy;
          if (op.axis === 'left') cx = bounds.x + width / 2; if (op.axis === 'center') cx = bounds.x + bounds.width / 2; if (op.axis === 'right') cx = bounds.x + bounds.width - width / 2;
          if (op.axis === 'top') cy = bounds.y + height / 2; if (op.axis === 'middle') cy = bounds.y + bounds.height / 2; if (op.axis === 'bottom') cy = bounds.y + bounds.height - height / 2;
          placeWorld(page, n, { cx, cy });
        } } selectionIds = roots.map(n => n.id); break;
      }
      case 'distribute': {
        const roots = selectedRoots(page, op.ids); if (!['horizontal', 'vertical'].includes(op.axis)) throw new Error('분배 방향이 올바르지 않습니다.');
        const before = worlds(page), horizontal = op.axis === 'horizontal', center = (n: DesignNode) => horizontal ? before.get(n.id)!.cx : before.get(n.id)!.cy, extent = (n: DesignNode) => (horizontal ? n.width : n.height) * before.get(n.id)!.scale;
        const sorted = [...roots].sort((a, b) => center(a) - extent(a) / 2 - center(b) + extent(b) / 2);
        if (sorted.length >= 3) { const start = center(sorted[0]) - extent(sorted[0]) / 2, end = center(sorted[sorted.length - 1]) + extent(sorted[sorted.length - 1]) / 2, gap = (end - start - sorted.reduce((sum, n) => sum + extent(n), 0)) / (sorted.length - 1); let cursor = start;
          for (const n of sorted) { const w = before.get(n.id)!; placeWorld(page, n, { cx: horizontal ? cursor + extent(n) / 2 : w.cx, cy: horizontal ? w.cy : cursor + extent(n) / 2 }); cursor += extent(n) + gap; }
        } selectionIds = roots.map(n => n.id); break;
      }
      case 'reorder': {
        const roots = selectedRoots(page, op.ids), set = new Set(roots.map(n => n.id)); if (!['front', 'back', 'forward', 'backward'].includes(op.direction)) throw new Error('레이어 순서가 올바르지 않습니다.');
        for (const parentId of new Set(roots.map(n => n.parentId))) {
          let siblings = getChildren(page, parentId);
          if (op.direction === 'front') siblings = [...siblings.filter(n => !set.has(n.id)), ...siblings.filter(n => set.has(n.id))];
          if (op.direction === 'back') siblings = [...siblings.filter(n => set.has(n.id)), ...siblings.filter(n => !set.has(n.id))];
          if (op.direction === 'forward') for (let i = siblings.length - 2; i >= 0; i--) if (set.has(siblings[i].id) && !set.has(siblings[i + 1].id)) [siblings[i], siblings[i + 1]] = [siblings[i + 1], siblings[i]];
          if (op.direction === 'backward') for (let i = 1; i < siblings.length; i++) if (set.has(siblings[i].id) && !set.has(siblings[i - 1].id)) [siblings[i], siblings[i - 1]] = [siblings[i - 1], siblings[i]];
          let i = 0; page.nodes = page.nodes.map(n => (n.parentId || undefined) === (parentId || undefined) ? siblings[i++] : n);
        } selectionIds = roots.map(n => n.id); break;
      }
      case 'component': {
        const roots = selectedRoots(page, op.ids); let master: DesignNode;
        if (roots.length === 1 && ['frame', 'group'].includes(roots[0].type)) master = roots[0]; else { master = groupNodes(page, op.ids, op.name || '컴포넌트'); addCreated([master]); }
        master.componentRole = 'master'; master.componentId = master.id; if (op.name) master.name = text(op.name, master.name, 200);
        for (const n of page.nodes.filter(n => descendants(page, [master.id]).includes(n.id))) { n.componentId = master.id; delete n.componentSourceId; delete n.overrides; if (n.id !== master.id) delete n.componentRole; }
        selectionIds = [master.id]; break;
      }
      case 'instantiate': {
        const sourcePage = next.pages.find(p => p.nodes.some(n => n.id === op.masterId && n.componentRole === 'master')), master = sourcePage?.nodes.find(n => n.id === op.masterId);
        if (!sourcePage || !master) throw new Error('원본 컴포넌트를 찾을 수 없습니다.');
        const sourceIds = new Set(descendants(sourcePage, [master.id])), sources = sourcePage.nodes.filter(n => sourceIds.has(n.id)), map = new Map(sources.map(n => [n.id, uuid()])), originalWorld = worlds(sourcePage).get(master.id)!;
        const copies = sources.map(source => { const n = clone(source); n.id = map.get(source.id)!; n.parentId = source.id === master.id ? undefined : map.get(source.parentId!); n.componentRole = source.id === master.id ? 'instance' : undefined; n.componentId = master.id; n.componentSourceId = source.id; n.overrides = source.id === master.id ? ['x', 'y', 'rotation', 'scale'] : []; if (source.id === master.id) { n.x = number(op.x, originalWorld.cx - master.width / 2 + 24, -16384, 32768); n.y = number(op.y, originalWorld.cy - master.height / 2 + 24, -16384, 32768); n.rotation = ((originalWorld.rotation + 180) % 360 + 360) % 360 - 180; n.scale = originalWorld.scale; } return n; });
        page.nodes.push(...copies); selectionIds = [map.get(master.id)!]; addCreated(copies); break;
      }
      case 'resize_page': {
        if (!validArtboardSize(op.width,op.height)) throw new Error('아트보드 크기는 1~16,384px입니다.');
        resizeChildren(page, undefined, page.width, page.height, op.width, op.height); page.width = op.width; page.height = op.height; break;
      }
      case 'token_update': {
        const name = text(op.name, '', 100), value = color(op.value, ''); if (!name || !value) throw new Error('색상 토큰이 올바르지 않습니다.');
        next.tokens ??= { colors: [] }; const token = next.tokens.colors.find(t => t.name === name); if (token) token.value = value; else next.tokens.colors.push({ name, value }); if (next.tokens.colors.length > 500) throw new Error('색상 토큰은 최대 500개입니다.'); break;
      }
      default: throw new Error('지원하지 않는 작업입니다.');
    }
    assertTree(page);
  }
  syncComponents(next); next.pages = next.pages.map(p => resolvePage(p)); next.pages.forEach(assertTree);
  const allIds = next.pages.flatMap(p => p.nodes.map(n => n.id)); if (new Set(allIds).size !== allIds.length) throw new Error('중복 요소 ID가 있습니다.');
  next.version = 2; if (operations.length) next.revision = (project.revision ?? 0) + 1;
  selectionIds = selectionIds.filter(id => next.pages.find(p => p.id === pageId)?.nodes.some(n => n.id === id));
  const previousIds = new Set(project.pages.flatMap(p => p.nodes.map(n => n.id)));
  createdIds = allIds.filter(id => !previousIds.has(id));
  return { project: next, selectionIds, createdIds };
}
