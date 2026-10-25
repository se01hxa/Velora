import { describe, expect, it } from 'vitest';
import { parseProject } from './validation';
import { exportDesign } from './exporters';

function rawNode(overrides: Record<string, unknown> = {}) {
  return { id: 'node', type: 'text', name: '제목', x: 10, y: 20, width: 180, height: 40, text: '안녕하세요', fill: 'transparent', color: '#123456', fontSize: 20, fontWeight: 600, radius: 0, opacity: 1, rotation: 0, blur: 0, duration: 2, animation: 'none', visible: true, locked: false, glass: false, shadow: false, ...overrides };
}
function rawProject(overrides: Record<string, unknown> = {}, nodeOverrides: Record<string, unknown> = {}) {
  return { version: 1, name: '예제', activePageId: 'page', pages: [{ id: 'page', name: '모바일', kind: 'mobile', width: 390, height: 844, background: '#ffffff', nodes: [rawNode(nodeOverrides)] }], ...overrides };
}
function parseNode(overrides: Record<string, unknown>) { return parseProject(JSON.stringify(rawProject({}, overrides))).pages[0].nodes[0]; }

describe('project import validation', () => {
  it('round-trips supported projects while omitting unknown object fields', () => {
    const value = rawProject({ unknown: 'discard' }, { script: '<script>bad()</script>' });
    const result = parseProject(JSON.stringify(value));
    expect(result.name).toBe('예제');
    expect(result.pages[0].nodes[0].text).toBe('안녕하세요');
    expect(result).not.toHaveProperty('unknown');
    expect(result.pages[0].nodes[0]).not.toHaveProperty('script');
  });

  it('rejects malformed documents and unsupported project/page/node schemas', () => {
    for (const raw of ['{', 'null', '[]', '{}', '"text"', JSON.stringify(rawProject({ version: 3 })), JSON.stringify(rawProject({ pages: [] })), JSON.stringify(rawProject({ pages: [null] })), JSON.stringify(rawProject({ pages: [{ nodes: {} }] })), JSON.stringify(rawProject({}, { type: 'script' }))]) {
      expect(() => parseProject(raw)).toThrow();
    }
  });

  it('enforces 100 pages and exactly 1000 layers per page', () => {
    const one = rawProject().pages[0];
    expect(() => parseProject(JSON.stringify(rawProject({ pages: Array.from({ length: 101 }, () => one) })))).toThrow();
    const accepted = rawProject({ pages: [{ ...one, nodes: Array.from({ length: 1000 }, () => rawNode()) }] });
    expect(parseProject(JSON.stringify(accepted)).pages[0].nodes).toHaveLength(1000);
    const rejected = rawProject({ pages: [{ ...one, nodes: Array.from({ length: 1001 }, () => rawNode()) }] });
    expect(() => parseProject(JSON.stringify(rejected))).toThrow();
  });

  it('enforces the 30MB limit by UTF-8 bytes before parsing', () => {
    const oversizedAscii = ' '.repeat(30_000_001);
    expect(() => parseProject(oversizedAscii)).toThrow(/30MB/);
    // 10 million Hangul characters occupy 30 million UTF-8 bytes, despite fewer JS characters.
    const oversizedUtf8 = JSON.stringify(rawProject({ note: '가'.repeat(10_000_001) }));
    expect(oversizedUtf8.length).toBeLessThan(30_000_000);
    expect(() => parseProject(oversizedUtf8)).toThrow(/30MB/);
  });

  it('replaces duplicate identifiers globally and resolves an invalid active page', () => {
    const one = rawProject().pages[0];
    const result = parseProject(JSON.stringify(rawProject({ activePageId: 'missing', pages: [one, { ...one, nodes: [rawNode({ id: 'page' }), rawNode()] }] })));
    const ids = result.pages.flatMap(p => [p.id, ...p.nodes.map(n => n.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.activePageId).toBe(result.pages[0].id);
    expect(parseProject(JSON.stringify(rawProject({ activePageId: 'missing', pages: [one, { ...one, nodes: [rawNode({ id: 'page' }), rawNode()] }] })))).toEqual(result);
  });

  it('clamps numeric bounds and supplies safe defaults for non-number values', () => {
    const n = parseNode({ x: -100000, y: 100000, width: -1, height: 100000, fontSize: '400px', fontWeight: 9999, opacity: 10, radius: -2, blur: 100000, rotation: 100000, duration: -1, animation: 'execute()' });
    expect(n).toMatchObject({ x: -4096, y: 8192, width: 1, height: 4096, fontSize: 16, fontWeight: 900, opacity: 1, radius: 0, blur: 60, rotation: 360, duration: .1, animation: 'none' });
    const p = rawProject(); p.pages[0].width = -1; p.pages[0].height = 100000;
    expect(parseProject(JSON.stringify(p)).pages[0]).toMatchObject({ width: 100, height: 4096 });
  });

  it('accepts only valid CSS hex lengths and transparent colors', () => {
    for (const value of ['#abc', '#abcd', '#aabbcc', '#aabbccdd', 'transparent']) expect(parseNode({ fill: value }).fill).toBe(value);
    for (const value of ['#ab', '#abcde', '#abcdefg', '#123456789', 'red;url(javascript:bad)', 'url(https://tracker.example)', '<style>']) expect(parseNode({ fill: value }).fill).toBe('#d4f58a');
  });

  it('allows only embedded PNG, JPEG and WebP images and rejects malformed padding', () => {
    for (const mime of ['png', 'jpeg', 'webp']) {
      const image = `data:image/${mime};base64,aGVsbG8=`;
      expect(parseNode({ image }).image).toBe(image);
    }
    for (const image of ['https://example.com/a.png', 'file:///C:/secret.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,===', 'data:image/png;base64,AAA=AA', 'data:image/png;base64,AAA===']) expect(parseNode({ image }).image).toBeUndefined();
    expect(parseNode({ image: `data:image/png;base64,${'A'.repeat(14_000_000)}` }).image).toBeUndefined();
  });

  it('limits text and names while treating hostile text as data throughout export', () => {
    const n = parseNode({ name: 'N'.repeat(500), text: 'T'.repeat(6000) });
    expect(n.name).toHaveLength(200); expect(n.text).toHaveLength(5000);
    const attack = '</div><script>window.desktop.close()</script>${Runtime.getRuntime()}';
    const project = parseProject(JSON.stringify(rawProject({}, { text: attack, name: attack })));
    expect(project.pages[0].nodes[0].text).toBe(attack);
    const html = exportDesign(project, project.pages[0], 'html')[0].content;
    expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
    const poisoned = JSON.parse(JSON.stringify(rawProject()));
    poisoned.__proto__ = { polluted: true };
    const imported = parseProject(JSON.stringify(poisoned));
    expect(Object.getPrototypeOf(imported)).toBe(Object.prototype);
    expect(imported).not.toHaveProperty('polluted');
  });
});

describe('version 2 project import', () => {
  it('migrates version 1 to version 2 without requiring new optional properties', () => {
    const result = parseProject(JSON.stringify(rawProject()));
    expect(result.version).toBe(2);
    expect(result.pages[0].nodes[0]).not.toHaveProperty('layout');
    expect(result.pages[0].nodes[0]).not.toHaveProperty('parentId');
    expect(parseProject(JSON.stringify(result))).toEqual(result);
  });

  it('preserves a large v2 banner and clamps it to extended bounds without changing legacy imports', () => {
    const page = { ...rawProject().pages[0], kind: 'banner', width: 12000, height: 6000, nodes: [rawNode({ width: 10000, height: 5000, x: -12000, y: 24000, fontSize: 800, radius: 6000, cornerRadii: [5000, 6000, 7000, 8000], blur: 90, strokeWidth: 180, keyframes: [{ time: 0, x: -12000, y: 24000 }] }), rawNode({ id: 'too-large', width: 1e6, height: 1e6, x: -1e6, y: 1e6, fontSize: 1e6, radius: 1e6, blur: 1e6, strokeWidth: 1e6, keyframes: [{ time: 0, x: -1e6, y: 1e6 }] }), rawNode({ id: 'small-text', fontSize: .1 })] };
    const result = parseProject(JSON.stringify(rawProject({ version: 2, pages: [page] })));
    expect(result.pages[0]).toMatchObject({ kind: 'banner', width: 12000, height: 6000 });
    expect(result.pages[0].nodes[0]).toMatchObject(page.nodes[0]);
    expect(result.pages[0].nodes[1]).toMatchObject({ width: 16384, height: 16384, x: -16384, y: 32768, fontSize: 1024, radius: 8192, blur: 100, strokeWidth: 200, keyframes: [{ time: 0, x: -16384, y: 32768 }] });
    expect(result.pages[0].nodes[2].fontSize).toBe(1);
    expect(parseProject(JSON.stringify(result))).toEqual(result);
    const legacy = parseProject(JSON.stringify(rawProject({ version: 1, pages: [page] })));
    expect(legacy.pages[0]).toMatchObject({ width: 4096, height: 4096 });
    expect(legacy.pages[0].nodes[0]).toMatchObject({ width: 4096, height: 4096, x: -4096, y: 8192, fontSize: 300, radius: 2048, blur: 60, strokeWidth: 100 });
    expect(parseProject(JSON.stringify(rawProject({ version: 2, pages: [{ ...page, width: 1e6, height: -1, nodes: [] }] })))).toMatchObject({ pages: [{ width: 16384, height: 1 }] });
  });

  it('preserves all supported rich fields and document metadata on a second import', () => {
    const page = { ...rawProject().pages[0], kind: 'desktop', grid: { visible: true, size: 16, snap: true }, notes: '출시 화면 검토', nodes: [
      rawNode({ id: 'container', type: 'group', layout: { direction: 'horizontal', gap: 12, padding: 24, align: 'center', justify: 'space-between' }, clipContent: true }),
      rawNode({ id: 'rich', parentId: 'container', type: 'vector', fillType: 'linear', gradient: { from: '#abcd', to: '#12345678', angle: 45 }, stroke: '#654321', strokeWidth: 2, cornerRadii: [4, 8, 12, 16], fontFamily: '맑은 고딕, sans-serif', lineHeight: 1.5, letterSpacing: 2, textAlign: 'right', verticalAlign: 'bottom', shadowX: -8, shadowY: 10, shadowBlur: 24, shadowColor: '#0008', blendMode: 'multiply', sizing: { horizontal: 'fill', vertical: 'hug' }, constraints: { horizontal: 'stretch', vertical: 'bottom' }, vectorPath: 'M0 0 L100 0 L100 100 Z', componentRole: 'master', componentId: 'rich', easing: 'ease-in-out', delay: .4, scale: 2, keyframes: [{ time: 0, opacity: 0, scale: .5 }, { time: 1, x: 20, y: 40, rotation: 30, scale: 1, opacity: 1 }], interaction: { trigger: 'hover', action: 'navigate', targetPageId: 'banner', transition: 'fade', duration: .5 } }),
      rawNode({ id: 'copy', componentRole: 'instance', componentId: 'rich', componentSourceId: 'rich', overrides: ['text', 'fill'] }),
    ] };
    const result = parseProject(JSON.stringify(rawProject({ version: 2, revision: 4, timeline: { duration: 8, fps: 60 }, tokens: { colors: [{ name: '브랜드', value: '#ABCDEF' }] }, pages: [page, { ...page, id: 'banner', kind: 'banner', nodes: [] }] })));
    expect(result).toMatchObject({ version: 2, revision: 4, timeline: { duration: 8, fps: 60 }, tokens: { colors: [{ name: '브랜드', value: '#abcdef' }] } });
    expect(result.pages[0]).toMatchObject({ kind: 'desktop', grid: page.grid, notes: page.notes });
    expect(result.pages[1].kind).toBe('banner');
    expect(result.pages[0].nodes[1]).toMatchObject(page.nodes[1]);
    expect(result.pages[0].nodes[2]).toMatchObject(page.nodes[2]);
    expect(parseProject(JSON.stringify(result))).toEqual(result);
  });

  it('remaps parent and cross-page interaction references when IDs collide globally', () => {
    const original = rawProject().pages[0];
    const value = rawProject({ version: 2, pages: [{ ...original, id: 'container', nodes: [rawNode({ id: 'container', type: 'frame' }), rawNode({ id: 'child', parentId: 'container', interaction: { action: 'navigate', targetPageId: 'second' } })] }, { ...original, id: 'second', nodes: [] }] });
    const result = parseProject(JSON.stringify(value));
    expect(result.pages[0].nodes[0].id).toBe('container-2');
    expect(result.pages[0].nodes[1].parentId).toBe('container-2');
    expect(result.pages[0].nodes[1].interaction?.targetPageId).toBe('second');
  });

  it('resolves references before truncating long source identifiers', () => {
    const pageId = 'page-'.repeat(100), masterId = 'master-'.repeat(100);
    const original = rawProject().pages[0];
    const value = rawProject({ activePageId: pageId, pages: [{ ...original, id: pageId, nodes: [rawNode({ id: masterId, type: 'group', componentRole: 'master' }), rawNode({ parentId: masterId, componentSourceId: masterId, interaction: { targetPageId: pageId } })] }] });
    const result = parseProject(JSON.stringify(value));
    expect(result.activePageId).toBe(pageId.slice(0, 100));
    expect(result.pages[0].nodes[1]).toMatchObject({ parentId: masterId.slice(0, 100), componentSourceId: masterId.slice(0, 100), interaction: { targetPageId: pageId.slice(0, 100) } });
    expect(parseProject(JSON.stringify(result))).toEqual(result);
  });

  it('rejects dangling, ambiguous, cross-page and cyclic parent relationships', () => {
    const page = rawProject().pages[0];
    const cases = [
      [rawNode({ parentId: 'missing' })],
      [rawNode({ parentId: 'node' })],
      [rawNode({ id: 'a', parentId: 'b' }), rawNode({ id: 'b', parentId: 'a' })],
      [rawNode({ id: 'same' }), rawNode({ id: 'same' }), rawNode({ id: 'child', parentId: 'same' })],
      [rawNode({ parentId: 5 })],
    ];
    for (const nodes of cases) expect(() => parseProject(JSON.stringify(rawProject({ version: 2, pages: [{ ...page, nodes }] })))).toThrow(/부모|순환/);
    expect(() => parseProject(JSON.stringify(rawProject({ pages: [{ ...page, nodes: [rawNode({ parentId: 'elsewhere' })] }, { ...page, id: 'second', nodes: [rawNode({ id: 'elsewhere' })] }] })))).toThrow(/부모/);
  });

  it('accepts a maximum-depth valid hierarchy without recursive traversal', () => {
    const page = rawProject().pages[0];
    const nodes = Array.from({ length: 1000 }, (_, index) => rawNode({ id: `n-${index}`, type: 'group', ...(index ? { parentId: `n-${index - 1}` } : {}) }));
    const result = parseProject(JSON.stringify(rawProject({ pages: [{ ...page, nodes }] })));
    expect(result.pages[0].nodes.at(-1)?.parentId).toBe('n-998');
  });

  it('normalizes rich numeric fields, enums, colors and booleans to safe values', () => {
    const node = parseNode({ gradient: { from: 'url(https://example.com)', to: '#BAD', angle: 999 }, stroke: 'red;}', strokeWidth: -10, cornerRadii: [-1, 1e8, '4', 10], fontFamily: 'Arial; background:url(file:///C:/secret)', lineHeight: -1, letterSpacing: 1e9, shadowX: -1e9, shadowY: 1e9, shadowBlur: 1e9, shadowColor: 'url(x)', blendMode: 'difference', textAlign: 'bad', verticalAlign: 'bad', scale: 0, delay: 1e9, clipContent: 'yes', layout: { direction: 'grid', gap: -10, padding: 1e9, align: 'bad', justify: 'bad' }, sizing: { horizontal: 'bad', vertical: 'fill' }, constraints: { horizontal: 'bad', vertical: 'bad' } });
    expect(node).toMatchObject({ gradient: { from: 'transparent', to: '#bad', angle: 360 }, stroke: 'transparent', strokeWidth: 0, cornerRadii: [0, 2048, 0, 10], fontFamily: 'system-ui', lineHeight: .5, letterSpacing: 100, shadowX: -2048, shadowY: 2048, shadowBlur: 300, shadowColor: '#0f172a2e', blendMode: 'normal', textAlign: 'left', verticalAlign: 'top', scale: .01, delay: 120, clipContent: false, layout: { direction: 'none', gap: 0, padding: 2048, align: 'start', justify: 'start' }, sizing: { horizontal: 'fixed', vertical: 'fill' }, constraints: { horizontal: 'left', vertical: 'top' } });
    const parsed = parseProject(JSON.stringify(rawProject({ revision: -10, timeline: { duration: 999, fps: 999 }, tokens: { colors: [{ name: 'N'.repeat(1000), value: 'url(x)' }] }, pages: [{ ...rawProject().pages[0], grid: { visible: 'true', size: 0, snap: 1 }, notes: 'X'.repeat(30000) }] })));
    expect(parsed.revision).toBe(0); expect(parsed.timeline).toEqual({ duration: 120, fps: 120 });
    expect(parsed.pages[0].grid).toEqual({ visible: false, size: 1, snap: false });
    expect(parsed.pages[0].notes).toHaveLength(20000);
    expect(parsed.tokens?.colors[0]).toEqual({ name: 'N'.repeat(100), value: '#000000' });
  });

  it('allows geometry paths while removing markup, file paths and malformed geometry', () => {
    for (const path of ['M0 0L10 20Z', 'm 1e2 -2.5 c 0 1 2 3 4 5 z', 'M0,0 A10,10 0 0 1 20,20']) expect(parseNode({ vectorPath: path }).vectorPath).toBe(path);
    for (const path of ['<svg onload="bad()">', 'M0 0"/><script>bad()</script>', 'file:///C:/Windows/secret', 'url(https://example.com/a.svg)', 'M0 0 L', 'M1e999 0', 'M0 0 Z1', 'M0 0 ' + '1 '.repeat(10000)]) expect(parseNode({ vectorPath: path }).vectorPath).toBeUndefined();
  });

  it('bounds and sorts keyframes using the last frame at each timestamp', () => {
    const node = parseNode({ keyframes: [{ time: 5, x: 90000 }, { time: -1, opacity: -2, scale: 0 }, { time: 5, x: 42 }, { time: 500, y: -10000, rotation: 900, scale: 999, extra: 'discard' }] });
    expect(node.keyframes).toEqual([{ time: 0, opacity: 0, scale: .01 }, { time: 5, x: 42 }, { time: 120, y: -4096, rotation: 360, scale: 100 }]);
    for (const keyframes of [null, {}, [null], Array.from({ length: 1001 }, () => ({ time: 0 }))]) expect(() => parseNode({ keyframes })).toThrow(/키프레임/);
  });

  it('rejects missing component sources or prototype targets and limits overrides and color tokens', () => {
    expect(() => parseNode({ componentSourceId: 'missing' })).toThrow(/컴포넌트/);
    expect(() => parseNode({ componentId: 'missing' })).toThrow(/컴포넌트/);
    expect(parseNode({ overrides: ['text', '__proto__', 'constructor', 'parentId', 'text', 'fill'] }).overrides).toEqual(['text', 'parentId', 'fill']);
    for (const overrides of [null, Array(1001).fill('text')]) expect(() => parseNode({ overrides })).toThrow(/재정의/);
    for (const tokens of [null, { colors: {} }, { colors: [null] }, { colors: Array(501).fill({ name: 'Color', value: '#fff' }) }]) expect(() => parseProject(JSON.stringify(rawProject({ tokens })))).toThrow(/토큰/);
    expect(() => parseNode({ cornerRadii: [1, 2, 3] })).toThrow(/모서리/);
  });

  it('preserves instance placement overrides and deleted-child markers through canonical IDs', () => {
    const masterId = 'master-'.repeat(100), sourceId = 'child-'.repeat(100);
    const page = { ...rawProject().pages[0], id: 'page', nodes: [rawNode({ id: masterId, type: 'group', componentRole: 'master', componentId: masterId }), rawNode({ id: sourceId, parentId: masterId }), rawNode({ id: 'instance', componentRole: 'instance', componentId: masterId, componentSourceId: masterId, overrides: ['x', 'y', 'parentId', `deleted:${sourceId}`, 'deleted:removed-source'] })] };
    const result = parseProject(JSON.stringify(rawProject({ pages: [page] })));
    expect(result.pages[0].nodes[2]).toMatchObject({ componentId: masterId.slice(0, 100), componentSourceId: masterId.slice(0, 100), overrides: ['x', 'y', 'parentId', `deleted:${sourceId.slice(0, 100)}`, 'deleted:removed-source'] });
    expect(parseProject(JSON.stringify(result))).toEqual(result);
  });

  it('validates interaction targets and removes unknown nested fields', () => {
    expect(() => parseNode({ interaction: { targetPageId: 'file:///C:/secret' } })).toThrow(/페이지/);
    const node = parseNode({ interaction: { trigger: 'script', action: 'execute', transition: 'bad', duration: -1, script: 'bad()' }, layout: { script: 'bad()' }, keyframes: [{ time: 0, script: 'bad()' }] });
    expect(node.interaction).toEqual({ trigger: 'click', action: 'navigate', targetPageId: undefined, transition: 'instant', duration: 0 });
    expect(node.layout).not.toHaveProperty('script');
    expect(node.keyframes?.[0]).not.toHaveProperty('script');
    const poisoned = JSON.stringify(rawProject()).replace('"version":1', '"version":2,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}');
    expect(parseProject(poisoned)).not.toHaveProperty('polluted');
    expect({}).not.toHaveProperty('polluted');
  });
});
