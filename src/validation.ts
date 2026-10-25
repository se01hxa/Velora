import type { DesignNode, DesignPage, DesignProject, NodeKeyframe } from './types';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const str = (value: unknown, fallback = '', max = 5000) => typeof value === 'string' ? value.slice(0, max) : fallback;
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^(#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|transparent)$/i.test(value) ? value.toLowerCase() : fallback;
const choice = <const T extends string>(value: unknown, options: readonly T[], fallback: T): T => options.includes(value as T) ? value as T : fallback;
const has = (value: RecordValue, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const nodeTypes = ['frame', 'text', 'button', 'ellipse', 'image', 'group', 'line', 'polygon', 'vector'] as const;
interface Bounds { size: number; minPosition: number; maxPosition: number; minFont: number; maxFont: number; radius: number; blur: number; stroke: number; }
const legacyBounds: Bounds = { size: 4096, minPosition: -4096, maxPosition: 8192, minFont: 6, maxFont: 300, radius: 2048, blur: 60, stroke: 100 };
const extendedBounds: Bounds = { size: 16384, minPosition: -16384, maxPosition: 32768, minFont: 1, maxFont: 1024, radius: 8192, blur: 100, stroke: 200 };

function imageData(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length >= 14_000_000) return;
  const match = /^data:image\/(png|jpeg|webp);base64,([a-z\d+/]+={0,2})$/i.exec(value);
  if (!match) return;
  const data = match[2];
  // Padded base64 must have complete groups. Unpadded base64 may omit 1–2 padding bytes.
  if (data.length % 4 === 1 || (data.includes('=') && data.length % 4 !== 0)) return;
  return value;
}

/** Accept only bounded SVG path data, never URLs, markup or executable SVG content. */
function vectorPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.length || value.length > 20_000 || !/^\s*[Mm]/.test(value)) return;
  const tokenPattern = /[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
  const matches = [...value.matchAll(tokenPattern)];
  if (matches.length > 5000 || value.replace(tokenPattern, '').replace(/[\s,]/g, '')) return;
  const counts: Record<string, number> = { m: 2, z: 0, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7 };
  let command = '', count = 0;
  for (const match of matches) {
    const token = match[0];
    if (/^[a-z]$/i.test(token)) {
      if (command && (counts[command] === 0 ? count !== 0 : !count || count % counts[command] !== 0)) return;
      command = token.toLowerCase(); count = 0;
    } else {
      if (!command || counts[command] === 0 || !Number.isFinite(Number(token)) || Math.abs(Number(token)) > 1_000_000) return;
      count++;
    }
  }
  if (!command || (counts[command] === 0 ? count !== 0 : !count || count % counts[command] !== 0)) return;
  return value.trim();
}

function keyframes(value: unknown, bounds: Bounds): NodeKeyframe[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('애니메이션 키프레임을 확인해 주세요 (요소당 최대 1,000개).');
  const byTime = new Map<number, NodeKeyframe>();
  for (const raw of value) {
    if (!record(raw)) throw new Error('올바르지 않은 애니메이션 키프레임입니다.');
    const frame: NodeKeyframe = { time: finite(raw.time, 0, 120, 0) };
    if (has(raw, 'x')) frame.x = finite(raw.x, bounds.minPosition, bounds.maxPosition, 0);
    if (has(raw, 'y')) frame.y = finite(raw.y, bounds.minPosition, bounds.maxPosition, 0);
    if (has(raw, 'rotation')) frame.rotation = finite(raw.rotation, -360, 360, 0);
    if (has(raw, 'scale')) frame.scale = finite(raw.scale, .01, 100, 1);
    if (has(raw, 'opacity')) frame.opacity = finite(raw.opacity, 0, 1, 1);
    // Duplicate timestamps use the last frame; playback always receives ascending frames.
    byTime.set(frame.time, frame);
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function parseNode(raw: RecordValue, id: string, bounds: Bounds): DesignNode {
  if (!nodeTypes.includes(raw.type as typeof nodeTypes[number])) throw new Error('알 수 없는 요소가 포함되어 있습니다.');
  const node: DesignNode = {
    id, name: str(raw.name, raw.type as string, 200), type: raw.type as DesignNode['type'],
    x: finite(raw.x, bounds.minPosition, bounds.maxPosition, 0), y: finite(raw.y, bounds.minPosition, bounds.maxPosition, 0),
    width: finite(raw.width, 1, bounds.size, 100), height: finite(raw.height, 1, bounds.size, 100),
    fill: color(raw.fill, '#d4f58a'), color: color(raw.color, '#151b28'), text: str(raw.text),
    fontSize: finite(raw.fontSize, bounds.minFont, bounds.maxFont, 16), fontWeight: finite(raw.fontWeight, 100, 900, 400),
    radius: finite(raw.radius, 0, bounds.radius, 20), opacity: finite(raw.opacity, 0, 1, 1),
    rotation: finite(raw.rotation, -360, 360, 0), blur: finite(raw.blur, 0, bounds.blur, 0),
    glass: raw.glass === true, shadow: raw.shadow === true, visible: raw.visible !== false, locked: raw.locked === true,
    animation: choice(raw.animation, ['none', 'float', 'pulse', 'fade', 'slide'], 'none'),
    duration: finite(raw.duration, .1, 120, 2), image: imageData(raw.image),
  };
  if (has(raw, 'fillType')) node.fillType = choice(raw.fillType, ['solid', 'linear'], 'solid');
  if (record(raw.gradient)) node.gradient = { from: color(raw.gradient.from, node.fill), to: color(raw.gradient.to, '#ffffff'), angle: finite(raw.gradient.angle, -360, 360, 135) };
  if (has(raw, 'stroke')) node.stroke = color(raw.stroke, 'transparent');
  if (has(raw, 'strokeWidth')) node.strokeWidth = finite(raw.strokeWidth, 0, bounds.stroke, 0);
  if (has(raw, 'cornerRadii')) {
    if (!Array.isArray(raw.cornerRadii) || raw.cornerRadii.length !== 4) throw new Error('모서리 반경은 네 개의 값이어야 합니다.');
    node.cornerRadii = raw.cornerRadii.map(value => finite(value, 0, bounds.radius, node.radius)) as [number, number, number, number];
  }
  if (has(raw, 'fontFamily')) node.fontFamily = typeof raw.fontFamily === 'string' && /^[\p{L}\p{N} _,.-]{1,160}$/u.test(raw.fontFamily) ? raw.fontFamily : 'system-ui';
  if (has(raw, 'lineHeight')) node.lineHeight = finite(raw.lineHeight, .5, 5, 1.2);
  if (has(raw, 'letterSpacing')) node.letterSpacing = finite(raw.letterSpacing, -20, 100, 0);
  if (has(raw, 'textAlign')) node.textAlign = choice(raw.textAlign, ['left', 'center', 'right'], 'left');
  if (has(raw, 'verticalAlign')) node.verticalAlign = choice(raw.verticalAlign, ['top', 'center', 'bottom'], 'top');
  if (has(raw, 'shadowX')) node.shadowX = finite(raw.shadowX, -2048, 2048, 0);
  if (has(raw, 'shadowY')) node.shadowY = finite(raw.shadowY, -2048, 2048, 12);
  if (has(raw, 'shadowBlur')) node.shadowBlur = finite(raw.shadowBlur, 0, 300, 28);
  if (has(raw, 'shadowColor')) node.shadowColor = color(raw.shadowColor, '#0f172a2e');
  if (has(raw, 'blendMode')) node.blendMode = choice(raw.blendMode, ['normal', 'multiply', 'screen', 'overlay'], 'normal');
  if (has(raw, 'clipContent')) node.clipContent = raw.clipContent === true;
  if (record(raw.layout)) node.layout = {
    direction: choice(raw.layout.direction, ['none', 'horizontal', 'vertical'], 'none'),
    gap: finite(raw.layout.gap, 0, 2048, 16), padding: finite(raw.layout.padding, 0, 2048, 16),
    align: choice(raw.layout.align, ['start', 'center', 'end'], 'start'),
    justify: choice(raw.layout.justify, ['start', 'center', 'end', 'space-between'], 'start'),
  };
  if (record(raw.sizing)) node.sizing = { horizontal: choice(raw.sizing.horizontal, ['fixed', 'fill', 'hug'], 'fixed'), vertical: choice(raw.sizing.vertical, ['fixed', 'fill', 'hug'], 'fixed') };
  if (record(raw.constraints)) node.constraints = { horizontal: choice(raw.constraints.horizontal, ['left', 'right', 'center', 'stretch'], 'left'), vertical: choice(raw.constraints.vertical, ['top', 'bottom', 'center', 'stretch'], 'top') };
  if (has(raw, 'vectorPath')) node.vectorPath = vectorPath(raw.vectorPath);
  if (has(raw, 'componentRole')) node.componentRole = choice(raw.componentRole, ['master', 'instance'], 'instance');
  if (typeof raw.componentId === 'string') node.componentId = raw.componentId;
  // Keep reference strings intact until they are resolved to bounded canonical IDs below.
  if (typeof raw.componentSourceId === 'string') node.componentSourceId = raw.componentSourceId;
  if (has(raw, 'overrides')) {
    if (!Array.isArray(raw.overrides) || raw.overrides.length > 1000) throw new Error('컴포넌트 재정의가 너무 많거나 올바르지 않습니다.');
    const allowed = new Set(['name', 'text', 'fill', 'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing', 'textAlign', 'verticalAlign', 'x', 'y', 'parentId', 'width', 'height', 'radius', 'cornerRadii', 'opacity', 'rotation', 'blur', 'glass', 'shadow', 'shadowX', 'shadowY', 'shadowBlur', 'shadowColor', 'stroke', 'strokeWidth', 'fillType', 'gradient', 'visible', 'locked', 'image', 'layout', 'sizing', 'constraints', 'clipContent', 'blendMode', 'vectorPath', 'animation', 'duration', 'keyframes', 'easing', 'delay', 'interaction', 'scale']);
    node.overrides = [...new Set(raw.overrides.filter((key): key is string => typeof key === 'string' && (allowed.has(key) || key.startsWith('deleted:') && key.length > 8)))];
  }
  if (has(raw, 'keyframes')) node.keyframes = keyframes(raw.keyframes, bounds);
  if (has(raw, 'easing')) node.easing = choice(raw.easing, ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'], 'ease');
  if (has(raw, 'delay')) node.delay = finite(raw.delay, 0, 120, 0);
  if (has(raw, 'scale')) node.scale = finite(raw.scale, .01, 100, 1);
  if (record(raw.interaction)) node.interaction = {
    trigger: choice(raw.interaction.trigger, ['click', 'hover'], 'click'),
    action: choice(raw.interaction.action, ['navigate', 'overlay', 'close'], 'navigate'),
    targetPageId: typeof raw.interaction.targetPageId === 'string' ? raw.interaction.targetPageId : undefined,
    transition: choice(raw.interaction.transition, ['instant', 'fade', 'slide'], 'instant'),
    duration: finite(raw.interaction.duration, 0, 20, .3),
  };
  return node;
}

export function parseProject(raw: string): DesignProject {
  if (raw.length > 30_000_000 || new TextEncoder().encode(raw).byteLength > 30_000_000) throw new Error('프로젝트 파일이 너무 큽니다 (최대 30MB).');
  const source: unknown = JSON.parse(raw);
  if (!record(source) || ![1, 2].includes(source.version as number) || !Array.isArray(source.pages) || !source.pages.length || source.pages.length > 100) throw new Error('지원하는 Velora 프로젝트 파일이 아닙니다.');
  // Version 1 keeps its original import limits; version 2 supports large artboards and banners.
  const bounds = source.version === 2 ? extendedBounds : legacyBounds;
  const ids = new Set<string>();
  const suffixes = new Map<string, number>();
  const unique = (value: unknown, fallback: string): string => {
    const base = str(value, fallback, 100) || fallback;
    let id = base, count = suffixes.get(base) ?? 2;
    while (ids.has(id)) id = `${base.slice(0, 90)}-${count++}`;
    suffixes.set(base, count); ids.add(id); return id;
  };
  const pageIdMap = new Map<string, string>();
  const sourcePages: RecordValue[] = source.pages.map(page => {
    if (!record(page) || !Array.isArray(page.nodes) || page.nodes.length > 1000) throw new Error('페이지 요소를 확인해 주세요 (페이지당 최대 1,000개).');
    return page;
  });
  // Reserve all page IDs before layer IDs. Duplicate IDs always get deterministic suffixes.
  const pageIds = sourcePages.map((page, index) => {
    const id = unique(page.id, `page-${index + 1}`);
    if (typeof page.id === 'string' && !pageIdMap.has(page.id)) pageIdMap.set(page.id, id);
    return id;
  });
  type Reference = { id: string; count: number };
  const addReference = (map: Map<string, Reference>, sourceId: string, id: string) => {
    const previous = map.get(sourceId);
    if (previous) previous.count++;
    else map.set(sourceId, { id, count: 1 });
  };
  const globalNodeMap = new Map<string, Reference>();
  const pages: DesignPage[] = sourcePages.map((page, pageIndex) => {
    const rawNodes = page.nodes as unknown[];
    const localIds = new Map<string, Reference>();
    const nodes = rawNodes.map((value, index) => {
      if (!record(value)) throw new Error('올바르지 않은 요소가 포함되어 있습니다.');
      const id = unique(value.id, `node-${pageIndex + 1}-${index + 1}`);
      if (typeof value.id === 'string') {
        addReference(localIds, value.id, id);
        addReference(globalNodeMap, value.id, id);
      }
      return parseNode(value, id, bounds);
    });
    nodes.forEach((node, index) => {
      const parent = (rawNodes[index] as RecordValue).parentId;
      if (parent === undefined || parent === null || parent === '') return;
      const targets = typeof parent === 'string' ? localIds.get(parent) : undefined;
      if (!targets || targets.count !== 1) throw new Error('부모 요소를 찾을 수 없거나 식별자가 중복되어 있습니다.');
      node.parentId = targets.id;
    });
    const byId = new Map(nodes.map(node => [node.id, node]));
    const checked = new Set<string>();
    for (const node of nodes) {
      const path = new Set<string>();
      let cursor: DesignNode | undefined = node;
      while (cursor && !checked.has(cursor.id)) {
        if (path.has(cursor.id)) throw new Error('부모 요소 관계에 순환이 있습니다.');
        path.add(cursor.id); cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }
      for (const id of path) checked.add(id);
    }
    const result: DesignPage = {
      id: pageIds[pageIndex], name: str(page.name, 'Untitled', 200),
      kind: choice(page.kind, ['mobile', 'web', 'slide', 'desktop', 'banner'], 'web'),
      width: finite(page.width, source.version === 2 ? 1 : 100, bounds.size, 390), height: finite(page.height, source.version === 2 ? 1 : 100, bounds.size, 844),
      background: color(page.background, '#ffffff'), nodes,
    };
    if (record(page.grid)) result.grid = { visible: page.grid.visible === true, size: finite(page.grid.size, 1, 512, 8), snap: page.grid.snap === true };
    if (has(page, 'notes')) result.notes = str(page.notes, '', 20_000);
    return result;
  });
  for (const page of pages) for (const node of page.nodes) {
    if (node.interaction?.targetPageId !== undefined) {
      const target = pageIdMap.get(node.interaction.targetPageId);
      if (!target) throw new Error('인터랙션 대상 페이지를 찾을 수 없습니다.');
      node.interaction.targetPageId = target;
    }
    if (node.componentId !== undefined) {
      const targets = globalNodeMap.get(node.componentId);
      if (!targets || targets.count !== 1) throw new Error('컴포넌트 마스터를 찾을 수 없거나 식별자가 중복되어 있습니다.');
      node.componentId = targets.id;
    }
    if (node.componentSourceId !== undefined) {
      const targets = globalNodeMap.get(node.componentSourceId);
      if (!targets || targets.count !== 1) throw new Error('컴포넌트 원본 요소를 찾을 수 없거나 식별자가 중복되어 있습니다.');
      node.componentSourceId = targets.id;
    }
    if (node.overrides) node.overrides = [...new Set(node.overrides.map(key => {
      if (!key.startsWith('deleted:')) return key;
      const sourceId = key.slice(8), target = globalNodeMap.get(sourceId);
      // Markers for removed master children may outlive those source nodes.
      return `deleted:${target?.count === 1 ? target.id : sourceId.slice(0, 100)}`;
    }))];
  }
  const project: DesignProject = {
    version: 2, name: str(source.name, 'Untitled project', 200),
    activePageId: typeof source.activePageId === 'string' ? pageIdMap.get(source.activePageId) ?? pages[0].id : pages[0].id,
    pages,
  };
  if (has(source, 'revision')) project.revision = Math.floor(finite(source.revision, 0, Number.MAX_SAFE_INTEGER, 0));
  if (record(source.timeline)) project.timeline = { duration: finite(source.timeline.duration, .1, 120, 5), fps: Math.round(finite(source.timeline.fps, 1, 120, 30)) };
  if (has(source, 'tokens')) {
    if (!record(source.tokens) || !Array.isArray(source.tokens.colors) || source.tokens.colors.length > 500) throw new Error('색상 토큰을 확인해 주세요 (최대 500개).');
    project.tokens = { colors: source.tokens.colors.map(value => {
      if (!record(value)) throw new Error('올바르지 않은 색상 토큰입니다.');
      return { name: str(value.name, 'Color', 100), value: color(value.value, '#000000') };
    }) };
  }
  return project;
}
