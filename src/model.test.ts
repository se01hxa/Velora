import { describe, expect, it } from 'vitest';
import { applyOperations, descendants, flattenPage, getChildren, getRoots, normalizeNode, resolvePage, selectionBounds } from './model';
import { parseProject } from './validation';
import type { DesignNode, DesignPage, DesignProject, DesignOperation } from './types';

const node = (id: string, options: Partial<DesignNode> = {}): DesignNode => normalizeNode(options.type ?? 'frame', { id, x: 0, y: 0, width: 100, height: 100, ...options });
function page(nodes: DesignNode[]): DesignPage { return { id: 'page', name: 'Test', kind: 'web', width: 800, height: 600, background: '#fff', nodes }; }
function project(nodes: DesignNode[]): DesignProject { return { version: 2, name: 'Test', activePageId: 'page', revision: 4, pages: [page(nodes)] }; }
function run(p: DesignProject, ...ops: DesignOperation[]) { return applyOperations(p, 'page', ops); }
function find(p: DesignProject, id: string) { const n = p.pages[0].nodes.find(n => n.id === id); if (!n) throw new Error(`Missing ${id}`); return n; }
function flat(p: DesignProject, id: string) { return flattenPage(p.pages[0]).nodes.find(n => n.id === id)!; }
function sameGeometry(a: DesignNode, b: DesignNode) { for (const key of ['x', 'y', 'width', 'height', 'rotation'] as const) expect(a[key]).toBeCloseTo(b[key], 5); }

describe('design tree and transformations', () => {
  it('preserves advanced editor values across project save and reopen', () => {
    const p=project([node('wide',{width:12000,fontSize:900,duration:30,shadowBlur:290,shadowX:1500,letterSpacing:80,layout:{direction:'vertical',gap:1500,padding:1800,align:'center',justify:'start'}})]);
    const n=parseProject(JSON.stringify(p)).pages[0].nodes[0];
    expect(n).toMatchObject({width:12000,fontSize:900,duration:30,shadowBlur:290,shadowX:1500,letterSpacing:80,layout:{gap:1500,padding:1800}});
  });
  it('protects locked nodes and locked ancestors while allowing explicit unlock controls', () => {
    const p = project([node('parent', { locked: true }), node('child', { parentId: 'parent' })]);
    expect(() => run(p, { type: 'delete', ids: ['parent'] })).toThrow(/잠긴/);
    expect(() => run(p, { type: 'update', ids: ['child'], patch: { x: 20 } })).toThrow(/잠긴/);
    const unlocked = run(p, { type: 'update', ids: ['parent'], patch: { locked: false } }).project;
    expect(find(run(unlocked, { type: 'update', ids: ['child'], patch: { x: 20 } }).project, 'child').x).toBe(20);
  });
  it('provides safe defaults for old and new node kinds without retaining executable fields', () => {
    for (const type of ['frame', 'text', 'button', 'ellipse', 'image', 'group', 'line', 'polygon', 'vector'] as const) expect(normalizeNode(type).type).toBe(type);
    expect(normalizeNode('line').strokeWidth).toBe(2);
    expect(normalizeNode('text', { width: -1, opacity: 9, vectorPath: '<script/>', fill: 'url(bad)' })).toMatchObject({ width: 1, opacity: 1, fill: 'transparent' });
    expect(normalizeNode('vector', { vectorPath: 'M 0 0 L 100 0 L 50 100 Z' }).vectorPath).toBeTruthy();
  });

  it('resolves parent-relative coordinates, rotation, scale, visibility and opacity', () => {
    const p = page([node('parent', { x: 100, y: 100, width: 200, height: 200, rotation: 90, opacity: .5, visible: false }), node('child', { parentId: 'parent', x: 0, y: 0, width: 100, height: 100, opacity: .4 })]);
    const result = flattenPage(p).nodes[1];
    expect(result.x).toBeCloseTo(200); expect(result.y).toBeCloseTo(100); expect(result.rotation).toBeCloseTo(90);
    expect(result.opacity).toBeCloseTo(.2); expect(result.visible).toBe(false);
    const scaled = flattenPage(page([node('a', { scale: 2 }), node('b', { parentId: 'a', width: 20, height: 20 })])).nodes[1];
    expect(scaled).toMatchObject({ x: -50, y: -50, width: 40, height: 40, scale: 1 });
    expect(p.nodes[1].x).toBe(0);
  });

  it('returns roots, children, descendants and unrotated selection bounds', () => {
    const p = page([node('a', { x: 10, y: 20 }), node('b', { parentId: 'a', x: 10, y: 20, width: 20, height: 20 }), node('c', { parentId: 'b', width: 10, height: 10 }), node('d', { x: 300, y: 300 })]);
    expect(getRoots(p).map(n => n.id)).toEqual(['a', 'd']); expect(getChildren(p, 'a').map(n => n.id)).toEqual(['b']);
    expect(descendants(p, ['a', 'b'])).toEqual(['a', 'b', 'c']);
    expect(selectionBounds(p, ['a', 'd'])).toEqual({ x: 10, y: 20, width: 390, height: 380 });
    expect(selectionBounds(p, [])).toBeNull();
  });

  it('rejects cycles and unknown parents atomically', () => {
    const p = project([node('a'), node('b', { parentId: 'a' })]), before = JSON.stringify(p);
    expect(() => run(p, { type: 'update', ids: ['a'], patch: { fill: '#f00' } }, { type: 'reparent', ids: ['a'], parentId: 'b' })).toThrow();
    expect(() => run(p, { type: 'create', parentId: 'missing', node: { type: 'text' } })).toThrow();
    expect(() => run(p, { type: 'update', ids: ['a'], patch: { parentId: 'a' } })).toThrow();
    expect(JSON.stringify(p)).toBe(before);
  });

  it('reparents an entire subtree without changing world geometry under rotated/scaled parents', () => {
    const p = project([node('a', { x: 100, y: 80, rotation: 40, scale: 1.4 }), node('b', { x: 340, y: 100, rotation: -25, scale: .8 }), node('child', { parentId: 'a', x: 20, y: 15, width: 30, height: 40, rotation: 12 }), node('grandchild', { parentId: 'child', width: 8, height: 8 })]);
    const result = run(p, { type: 'reparent', ids: ['child'], parentId: 'b' }).project;
    sameGeometry(flat(p, 'child'), flat(result, 'child')); sameGeometry(flat(p, 'grandchild'), flat(result, 'grandchild'));
    expect(find(result, 'child').parentId).toBe('b'); expect(find(result, 'grandchild').parentId).toBe('child');
  });

  it('duplicates subtrees once with remapped parents and deletes the complete subtree', () => {
    const p = project([node('a', { x: 20 }), node('b', { parentId: 'a', x: 30 }), node('c', { parentId: 'b', width: 10 }), node('other', { x: 500 })]);
    const result = run(p, { type: 'duplicate', ids: ['a', 'b'], offset: { x: 35, y: 10 } });
    expect(result.createdIds).toHaveLength(3); expect(result.selectionIds).toHaveLength(1);
    const root = find(result.project, result.selectionIds[0]), child = result.project.pages[0].nodes.find(n => n.parentId === root.id)!;
    expect(root.x).toBe(55); expect(root.y).toBe(10); expect(child.x).toBe(30);
    expect(result.project.pages[0].nodes.some(n => n.parentId === child.id)).toBe(true);
    const removed = run(result.project, { type: 'delete', ids: [root.id] });
    expect(removed.project.pages[0].nodes).toHaveLength(4); expect(p.pages[0].nodes).toHaveLength(4);
  });

  it('groups and ungroups mixed-parent selections without moving the content', () => {
    const p = project([node('p', { x: 40, y: 50, rotation: 10 }), node('a', { parentId: 'p', x: 20, y: 20, width: 20 }), node('b', { x: 200, y: 220, width: 60 })]);
    const grouped = run(p, { type: 'group', ids: ['a', 'b'], name: 'Bundle' });
    const groupId = grouped.selectionIds[0]; expect(find(grouped.project, groupId).type).toBe('group');
    sameGeometry(flat(p, 'a'), flat(grouped.project, 'a')); sameGeometry(flat(p, 'b'), flat(grouped.project, 'b'));
    const ungrouped = run(grouped.project, { type: 'ungroup', ids: [groupId] });
    sameGeometry(flat(p, 'a'), flat(ungrouped.project, 'a')); sameGeometry(flat(p, 'b'), flat(ungrouped.project, 'b'));
    expect(ungrouped.selectionIds).toEqual(['a', 'b']);
  });
});

describe('layout, constraints and arrangement', () => {
  it('lays out horizontal fill and cross-axis fill within padding and gaps', () => {
    const p = page([node('row', { width: 400, height: 100, layout: { direction: 'horizontal', gap: 10, padding: 20, align: 'center', justify: 'start' } }), node('fixed', { parentId: 'row', width: 100, height: 30 }), node('fill', { parentId: 'row', sizing: { horizontal: 'fill', vertical: 'fill' } })]);
    const result = resolvePage(p), [_, a, b] = result.nodes;
    expect(a).toMatchObject({ x: 20, y: 35, width: 100, height: 30 }); expect(b).toMatchObject({ x: 130, y: 20, width: 250, height: 60 });
    expect(p.nodes[1].x).toBe(0); expect(resolvePage(result)).toEqual(result);
  });

  it('hugs content and places vertical stacks with space-between', () => {
    const hugging = resolvePage(page([node('row', { sizing: { horizontal: 'hug', vertical: 'hug' }, layout: { direction: 'horizontal', gap: 8, padding: 10, align: 'start', justify: 'start' } }), node('a', { parentId: 'row', width: 40, height: 20 }), node('b', { parentId: 'row', width: 60, height: 30 })]));
    expect(hugging.nodes[0]).toMatchObject({ width: 128, height: 50 });
    const stack = resolvePage(page([node('stack', { height: 200, width: 100, layout: { direction: 'vertical', gap: 5, padding: 10, align: 'end', justify: 'space-between' } }), node('a', { parentId: 'stack', height: 20, width: 30 }), node('b', { parentId: 'stack', height: 30, width: 40 })]));
    expect(stack.nodes[1]).toMatchObject({ x: 60, y: 10 }); expect(stack.nodes[2]).toMatchObject({ x: 50, y: 160 });
  });

  it('starts operations from resolved layout geometry when moving a child out of a stack', () => {
    const p = project([node('row', { x: 100, y: 80, width: 400, height: 100, layout: { direction: 'horizontal', gap: 10, padding: 20, align: 'start', justify: 'start' } }), node('first', { parentId: 'row', width: 100, height: 30 }), node('second', { parentId: 'row', width: 100, height: 30 })]);
    const before = flat(p, 'second');
    const moved = run(p, { type: 'reparent', ids: ['second'] }).project;
    sameGeometry(before, flat(moved, 'second'));
    expect(find(moved, 'second').parentId).toBeUndefined();
  });

  it('applies right/bottom/center/stretch constraints when resizing artboards and frames', () => {
    const p = project([node('right', { x: 650, y: 450, constraints: { horizontal: 'right', vertical: 'bottom' } }), node('center', { x: 350, y: 250, constraints: { horizontal: 'center', vertical: 'center' } }), node('stretch', { width: 500, height: 400, constraints: { horizontal: 'stretch', vertical: 'stretch' } }), node('child', { parentId: 'stretch', x: 300, y: 200, constraints: { horizontal: 'right', vertical: 'bottom' } })]);
    const resized = run(p, { type: 'resize_page', width: 1000, height: 800 }).project;
    expect(find(resized, 'right')).toMatchObject({ x: 850, y: 650 }); expect(find(resized, 'center')).toMatchObject({ x: 450, y: 350 });
    expect(find(resized, 'stretch')).toMatchObject({ width: 700, height: 600 }); expect(find(resized, 'child')).toMatchObject({ x: 500, y: 400 });
    const frame = run(resized, { type: 'update', ids: ['stretch'], patch: { width: 800, height: 650 } }).project;
    expect(find(frame, 'child')).toMatchObject({ x: 600, y: 450 });
  });

  it('aligns and distributes world frames, and reorders sibling sets without breaking descendants', () => {
    const p = project([node('a', { x: 0, y: 10, width: 20 }), node('b', { x: 50, y: 70, width: 30 }), node('c', { x: 200, y: 130, width: 40 }), node('child', { parentId: 'b' })]);
    const aligned = run(p, { type: 'align', ids: ['a', 'b', 'c'], axis: 'top' }).project;
    expect(['a', 'b', 'c'].map(id => find(aligned, id).y)).toEqual([10, 10, 10]);
    const distributed = run(p, { type: 'distribute', ids: ['a', 'b', 'c'], axis: 'horizontal' }).project;
    expect(find(distributed, 'b').x).toBeCloseTo(95);
    const front = run(p, { type: 'reorder', ids: ['a', 'b'], direction: 'front' }).project;
    expect(getRoots(front.pages[0]).map(n => n.id)).toEqual(['c', 'a', 'b']); expect(find(front, 'child').parentId).toBe('b');
  });
});

describe('components, animation and atomic batches', () => {
  it('propagates master edits to instances while preserving per-property overrides', () => {
    let p = run(project([node('card', { width: 200 }), node('label', { type: 'text', parentId: 'card', text: 'Master', fill: '#ff0000' })]), { type: 'component', ids: ['card'], name: 'Card' }).project;
    const instance = run(p, { type: 'instantiate', masterId: 'card', x: 400, y: 100 }); p = instance.project;
    const rootId = instance.selectionIds[0], label = p.pages[0].nodes.find(n => n.parentId === rootId)!;
    p = run(p, { type: 'update', ids: [label.id], patch: { text: 'My label' } }, { type: 'update', ids: ['label'], patch: { text: 'Changed master', fill: '#00ff00', x: 12 } }).project;
    expect(find(p, label.id)).toMatchObject({ text: 'My label', fill: '#00ff00', x: 12 }); expect(find(p, rootId)).toMatchObject({ x: 400, y: 100 });
    expect(find(p, label.id).overrides).toContain('text');
    p = run(p, { type: 'create', parentId: 'card', node: { type: 'ellipse', id: 'badge', width: 16, height: 16 } }).project;
    expect(p.pages[0].nodes.some(n => n.parentId === rootId && n.componentSourceId === 'badge')).toBe(true);
    p = run(p, { type: 'delete', ids: ['badge'] }).project;
    expect(p.pages[0].nodes.some(n => n.componentSourceId === 'badge')).toBe(false);
  });

  it('retains deleted instance children as overrides and detaches instances when a master is deleted', () => {
    let p = run(project([node('master'), node('child', { parentId: 'master' })]), { type: 'component', ids: ['master'] }).project;
    const created = run(p, { type: 'instantiate', masterId: 'master' }); p = created.project;
    const rootId = created.selectionIds[0], childId = p.pages[0].nodes.find(n => n.parentId === rootId)!.id;
    p = run(p, { type: 'delete', ids: [childId] }).project;
    expect(getChildren(p.pages[0], rootId)).toHaveLength(0); expect(find(p, rootId).overrides).toContain('deleted:child');
    p = run(p, { type: 'update', ids: ['master'], patch: { fill: '#123456' } }).project;
    expect(getChildren(p.pages[0], rootId)).toHaveLength(0);
    p = run(p, { type: 'delete', ids: ['master'] }).project;
    expect(find(p, rootId).componentRole).toBeUndefined(); expect(find(p, rootId).componentId).toBeUndefined();
  });

  it('preserves transformed master placement and rejects self-referencing component trees', () => {
    let p = project([node('container', { rotation: 40, scale: 1.5 }), node('master', { parentId: 'container', rotation: 15, width: 80, height: 50 })]);
    p = run(p, { type: 'component', ids: ['master'] }).project;
    const result = run(p, { type: 'instantiate', masterId: 'master', x: 300, y: 200 }), rootId = result.selectionIds[0];
    expect(flat(result.project, rootId).rotation).toBeCloseTo(55);
    expect(flat(result.project, rootId).width).toBeCloseTo(120);
    const before = JSON.stringify(result.project);
    expect(() => run(result.project, { type: 'reparent', ids: [rootId], parentId: 'master' })).toThrow(/컴포넌트/);
    expect(JSON.stringify(result.project)).toBe(before);
  });

  it('supports large v2 banners and follows extended node property limits', () => {
    const p = run(project([node('a')]), { type: 'resize_page', width: 12000, height: 6000 }, { type: 'update', ids: ['a'], patch: { x: 20000, y: -10000, width: 8000, height: 5000, fontSize: 800, radius: 5000, blur: 90, strokeWidth: 180 } }).project;
    expect(p.pages[0]).toMatchObject({ width: 12000, height: 6000 });
    expect(find(p, 'a')).toMatchObject({ x: 20000, y: -10000, width: 8000, height: 5000, fontSize: 800, radius: 5000, blur: 90, strokeWidth: 180 });
  });

  it('samples partial keyframes, easing, delay and motion without changing authored values', () => {
    const p = page([node('a', { x: 10, opacity: .8, easing: 'linear', delay: 1, keyframes: [{ time: 0, x: 10 }, { time: 2, x: 110, opacity: .4 }] }), node('float', { y: 40, animation: 'float', duration: 2 })]);
    expect(resolvePage(p).nodes[0].x).toBe(10); expect(resolvePage(p, .5).nodes[0].x).toBe(10);
    expect(resolvePage(p, 2).nodes[0].x).toBe(60); expect(resolvePage(p, 2).nodes[0].opacity).toBeCloseTo(.6);
    expect(resolvePage(p, 10).nodes[0].x).toBe(110); expect(resolvePage(p, 1).nodes[1].y).toBeCloseTo(30);
    expect(p.nodes[0].x).toBe(10); expect(p.nodes[1].y).toBe(40);
  });

  it('increments revision once per successful batch, resolves all pages statically, and updates tokens', () => {
    const p = project([node('a')]); p.pages.push({ ...page([node('anim', { animation: 'float', y: 100 })]), id: 'second' });
    const result = run(p, { type: 'update', ids: ['a'], patch: { x: 40 } }, { type: 'token_update', name: 'Accent', value: '#ABC' });
    expect(result.project.revision).toBe(5); expect(result.project.version).toBe(2); expect(result.project.tokens?.colors).toEqual([{ name: 'Accent', value: '#abc' }]);
    expect(result.project.pages[1].nodes[0].y).toBe(100); expect(p.revision).toBe(4);
    expect(() => run(p, { type: 'create', node: { type: 'frame', id: 'new' } }, { type: 'update', ids: ['missing'], patch: {} })).toThrow();
    expect(p.pages[0].nodes).toHaveLength(1);
  });
});
