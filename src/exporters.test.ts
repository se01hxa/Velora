import { describe, expect, it } from 'vitest';
import { exportDesign, notesForFormat } from './exporters';
import type { DesignNode, DesignPage, DesignProject, ExportFile, ExportFormat } from './types';

const baseNode: DesignNode = { id: 'one', name: 'Primary button', type: 'button', x: 24, y: 80, width: 180, height: 56, fill: '#6059ec', color: '#ffffff', text: '시작하기', fontSize: 18, fontWeight: 600, radius: 18, opacity: .8, rotation: 12, blur: 0, glass: false, shadow: true, visible: true, locked: false, animation: 'none', duration: 2 };
function fixture(overrides: Partial<DesignNode> = {}): { project: DesignProject; page: DesignPage } {
  const page: DesignPage = { id: 'page', name: '모바일 홈', kind: 'mobile', width: 390, height: 844, background: '#faf9ff', nodes: [{ ...baseNode, ...overrides }] };
  return { page, project: { version: 1, name: '내 프로젝트', activePageId: page.id, pages: [page] } };
}
function file(files: ExportFile[], name: string): string { const result = files.find(f => f.name === name); if (!result) throw new Error(`Missing ${name}`); return result.content; }
function output(format: ExportFormat, overrides: Partial<DesignNode> = {}): ExportFile[] { const { project, page } = fixture(overrides); return exportDesign(project, page, format); }

describe('code export contracts', () => {
  it('emits usable entry files and platform notes for every supported format', () => {
    const entries: [ExportFormat, string][] = [['html', 'index.html'], ['react', 'Screen.jsx'], ['xml', 'res/layout/screen.xml'], ['compose', 'Screen.kt'], ['svg', 'design.svg'], ['json', 'project.luma.json']];
    for (const [format, entry] of entries) {
      const files = output(format);
      expect(file(files, entry)).toBeTruthy();
      expect(new Set(files.map(f => f.name)).size).toBe(files.length);
      expect(notesForFormat(format).length).toBeGreaterThan(0);
      expect(files.every(f => !f.name.startsWith('/') && !f.name.includes('..'))).toBe(true);
    }
  });

  it('omits hidden layers from every rendered export while retaining them in editable JSON', () => {
    const { project, page } = fixture();
    page.nodes.push({ ...baseNode, id: 'hidden', visible: false, text: 'HIDDEN_PAYLOAD', name: 'HIDDEN_LAYER' });
    for (const format of ['html', 'react', 'xml', 'compose', 'svg'] as ExportFormat[]) {
      expect(exportDesign(project, page, format).map(f => f.content).join('\n')).not.toContain('HIDDEN_PAYLOAD');
    }
    expect(JSON.parse(file(exportDesign(project, page, 'json'), 'project.luma.json')).pages[0].nodes).toHaveLength(2);
  });

  it('escapes user text and names instead of inserting active markup or code', () => {
    const attack = '</title><script>alert("x")</script>& \' $price {danger}';
    const html = file(output('html', { name: attack, text: attack }), 'index.html');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    const react = file(output('react', { name: attack, text: attack }), 'Screen.jsx');
    expect(react).toContain('\\u003cscript>');
    expect(react).toContain('\\"x\\"');
    const kotlin = file(output('compose', { name: attack, text: attack }), 'Screen.kt');
    expect(kotlin).toContain('\\$price');
    expect(kotlin).toContain('\\"x\\"');
    expect(file(output('svg', { name: attack, text: attack }), 'design.svg')).not.toContain('<script>');
  });

  it('rejects active image formats and network or filesystem URLs', () => {
    for (const image of ['https://example.com/track.png', 'file:///C:/secret.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PHNjcmlwdD4=']) {
      for (const format of ['html', 'react', 'compose', 'svg'] as ExportFormat[]) {
        expect(output(format, { type: 'image', image }).map(f => f.content).join('\n')).not.toContain(image);
      }
    }
  });

  it('preserves supported embedded images without external dependencies', () => {
    const image = 'data:image/png;base64,iVBORw0KGgo=';
    expect(file(output('html', { type: 'image', image }), 'index.html')).toContain(image);
    expect(file(output('react', { type: 'image', image }), 'Screen.jsx')).toContain(image);
    expect(file(output('svg', { type: 'image', image }), 'design.svg')).toContain(image);
    expect(file(output('compose', { type: 'image', image }), 'Screen.kt')).toContain('Base64.decode("iVBORw0KGgo="');
  });

  it('exports geometry, shape, opacity, motion and effects in web CSS', () => {
    const css = file(output('html', { type: 'ellipse', blur: 5, glass: true, animation: 'float' }), 'styles.css');
    for (const fragment of ['left: 24px', 'top: 80px', 'width: 180px', 'height: 56px', 'border-radius: 50%', '--node-opacity: 0.8', '--rotation: 12deg', '--backdrop-blur: 5px', 'backdrop-filter: blur(var(--backdrop-blur))', 'box-shadow:', 'animation: luma-float 2s', 'prefers-reduced-motion']) expect(css).toContain(fragment);
    expect(css).not.toContain('--node-blur: 5px');
    expect(file(output('html', { blur: 5 }), 'styles.css')).toContain('--node-blur: 5px');
    expect(css).not.toContain('@import');
  });

  it('keeps text at the top-left with the editor line height while centering buttons', () => {
    const css = file(output('html', { type: 'text', fontSize: 30 }), 'styles.css');
    expect(css).toContain('line-height: 1.2;');
    expect(css).toContain('align-items: flex-start; justify-content: flex-start; text-align: left;');
    const svg = file(output('svg', { type: 'text', fontSize: 30, text: 'First\nSecond' }), 'design.svg');
    expect(svg).toContain('<tspan x="0" y="18">First</tspan><tspan x="0" y="54">Second</tspan>');
    const kotlin = file(output('compose', { type: 'text', fontSize: 30 }), 'Screen.kt');
    expect(kotlin).toContain('contentAlignment = Alignment.TopStart');
    expect(kotlin).toContain('lineHeight = 36.sp');
    expect(file(output('xml', { type: 'text' }), 'res/layout/screen.xml')).toContain('android:gravity="top|start"');
    expect(file(output('html'), 'styles.css')).toContain('justify-content: center; text-align: center;');
  });

  it('uses safe generated resource identifiers and Android AARRGGBB colors', () => {
    const files = output('xml', { id: '../../bad', name: '9 Attack / " name', fill: '#12345680', text: '@something? "hello" \'yes\'\n두 번째 줄' });
    const layout = file(files, 'res/layout/screen.xml');
    expect(layout).toContain('android:id="@+id/node_001"');
    expect(layout).toContain('android:layout_marginStart="24dp"');
    expect(layout).toContain('android:rotation="12"');
    expect(file(files, 'res/drawable/node_001_background.xml')).toContain('#80123456');
    expect(file(files, 'res/values/strings.xml')).toContain('\\&quot;hello\\&quot;');
    expect(file(files, 'res/values/strings.xml')).toContain('\\n두 번째 줄');
    expect(files.some(f => f.name.includes('bad'))).toBe(false);
  });

  it('emits Android animation resources and code that starts them', () => {
    const files = output('xml', { animation: 'pulse', duration: 3 });
    expect(file(files, 'res/anim/node_001_motion.xml')).toContain('android:duration="1500"');
    expect(file(files, 'res/anim/node_001_motion.xml')).toContain('android:repeatMode="reverse"');
    expect(file(files, 'ScreenActivity.kt')).toContain('R.anim.node_001_motion');
    expect(file(files, 'res/drawable/node_001_button.xml')).toContain('android:state_pressed="true"');
  });

  it('produces self-contained Compose imports, colors and escaped multiline strings', () => {
    const kotlin = file(output('compose', { fill: '#f008', text: '총 $12\n"완료"', animation: 'slide', blur: 4 }), 'Screen.kt');
    expect(kotlin).toContain('import androidx.compose.ui.unit.dp');
    expect(kotlin).toContain('Color(0x88FF0000)');
    expect(kotlin).toContain('총 \\$12\\n\\"완료\\"');
    expect(kotlin).toContain('translationX = motion * density');
    expect(kotlin).toContain('.blur(4.dp)');
  });

  it('splits large Kotlin data strings below the JVM constant string size limit', () => {
    const kotlin = file(output('compose', { type: 'image', image: `data:image/webp;base64,${'A'.repeat(68000)}` }), 'Screen.kt');
    expect(kotlin).toContain('Base64.decode(listOf(');
    const strings = kotlin.match(/"A+"/g) ?? [];
    expect(strings.length).toBeGreaterThan(1);
    expect(strings.every(s => s.length <= 16002)).toBe(true);
  });

  it('sanitizes invalid numeric and color values before generating executable styles', () => {
    const invalid = { x: NaN, y: Infinity, width: -1, opacity: 5, duration: -2, fill: 'red; background:url(javascript:attack)', rotation: Infinity };
    for (const format of ['html', 'react', 'xml', 'compose', 'svg'] as ExportFormat[]) {
      const result = output(format, invalid).map(f => f.content).join('\n');
      expect(result).not.toMatch(/NaN|Infinity|javascript:attack/);
    }
    expect(file(output('html', invalid), 'styles.css')).toContain('width: 1px');
  });

  it('returns independent note arrays and preserves projects without mutation', () => {
    const first = notesForFormat('html'); first.length = 0;
    expect(notesForFormat('html').length).toBeGreaterThan(0);
    const { project, page } = fixture(); const before = JSON.stringify(project);
    for (const format of ['html', 'react', 'xml', 'compose', 'svg', 'json'] as ExportFormat[]) exportDesign(project, page, format);
    expect(JSON.stringify(project)).toBe(before);
  });
});

describe('v2 hierarchy, visual styles and prototype export', () => {
  it('keeps HTML nested with flex layout while flattening native positions and inherited opacity', () => {
    const {project,page}=fixture({id:'parent',type:'group',x:100,y:50,width:300,height:200,opacity:.5,text:'',rotation:0,layout:{direction:'horizontal',gap:10,padding:20,align:'start',justify:'start'}});
    page.nodes.push({...baseNode,id:'child',parentId:'parent',type:'text',x:99,y:99,width:80,height:30,text:'Nested child',opacity:.6,rotation:0});
    const html=file(exportDesign(project,page,'html'),'index.html');
    expect(html).toMatch(/aria-label="Primary button"[^>]*>[^]*aria-label="Primary button"/);
    const css=file(exportDesign(project,page,'html'),'styles.css');
    expect(css).toContain('flex-direction: row; gap: 10px; padding: 20px;');
    expect(css).toContain('position: relative; left: auto; top: auto;');
    const xml=file(exportDesign(project,page,'xml'),'res/layout/screen.xml');
    expect(xml).toContain('android:layout_marginStart="120dp"');
    expect(xml).toContain('android:layout_marginTop="70dp"');
    expect(xml).toContain('android:alpha="0.3"');
  });
  it('omits descendants of hidden groups and clips SVG descendants to their ancestors', () => {
    const {project,page}=fixture({id:'parent',type:'frame',text:'',clipContent:true});
    page.nodes.push({...baseNode,id:'child',parentId:'parent',text:'Child clipped by parent'});
    expect(file(exportDesign(project,page,'svg'),'design.svg')).toContain('clip-path="url(#node_001_parent_clip)"');
    page.nodes[0].visible=false;
    for(const format of ['html','react','svg','compose','xml'] as ExportFormat[])expect(exportDesign(project,page,format).map(f=>f.content).join('\n')).not.toContain('Child clipped by parent');
  });
  it('exports safe gradients, strokes, advanced type and authored keyframes', () => {
    const opts:Partial<DesignNode>={fillType:'linear',gradient:{from:'#FF0000',to:'#0000FF',angle:125},stroke:'#123456',strokeWidth:3,fontFamily:'Georgia',lineHeight:1.5,letterSpacing:2,textAlign:'right',verticalAlign:'bottom',shadowX:4,shadowY:8,shadowBlur:20,shadowColor:'#00000040',duration:4,easing:'linear',delay:.2,keyframes:[{time:0,x:24,opacity:.8},{time:2,x:64,rotation:40,opacity:.4},{time:4,x:24,opacity:.8}]};
    const css=file(output('html',opts),'styles.css');
    expect(css).toContain('linear-gradient(125deg, rgba(255, 0, 0, 1), rgba(0, 0, 255, 1))');
    expect(css).toContain('border: 3px solid rgba(18, 52, 86, 1)');
    expect(css).toContain('font-family: Georgia;');
    expect(css).toContain('line-height: 1.5; letter-spacing: 2px');
    expect(css).toContain('text-align: right');
    expect(css).toContain('4px 8px 20px');
    expect(css).toContain('animation: luma-node_001 4s linear 0.2s infinite');
    expect(css).toContain('50% { transform: rotate(40deg) translate(40px, 0px)');
    const svg=file(output('svg',opts),'design.svg');
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('text-anchor="end"');
    expect(svg).toContain('stroke-width="3"');
    expect(file(output('compose',opts),'Screen.kt')).toContain('Brush.linearGradient');
    expect(file(output('xml',opts),'res/drawable/node_001_background.xml')).toContain('<gradient');
  });
  it('preserves normalized vector geometry in web, SVG and native exports', () => {
    for(const type of ['line','polygon','vector'] as const){
      const opts={type,vectorPath:'M5 50 C25 5 75 95 95 50',stroke:'#ff00ff',strokeWidth:2};
      expect(file(output('html',opts),'index.html')).toContain('viewBox="0 0 100 100"');
      expect(file(output('svg',opts),'design.svg')).toContain('vector-effect="non-scaling-stroke"');
      expect(file(output('compose',opts),'Screen.kt')).toContain('PathParser().parsePathString');
      expect(file(output('xml',opts),'res/drawable/node_001_background.xml')).toContain('<vector');
    }
    expect(file(output('svg',{type:'vector',vectorPath:'M0 0"/><script>bad</script>'}),'design.svg')).not.toContain('<script>');
  });
  it('exports page navigation using generated filenames and a fixed external runtime', () => {
    const {project,page}=fixture({interaction:{trigger:'click',action:'overlay',targetPageId:'page-two',transition:'fade',duration:.3}});
    project.version=2;
    project.pages.push({...page,id:'page-two',name:'Other screen',nodes:[]});
    const files=exportDesign(project,page,'html');
    expect(file(files,'index.html')).toContain('data-luma-target="page_002.html"');
    expect(file(files,'index.html')).toContain('<script src="runtime.js" defer></script>');
    expect(file(files,'page_002.html')).toContain('Other screen');
    expect(file(files,'runtime.js')).toContain("action === 'overlay'");
    expect(()=>new Function(file(files,'runtime.js'))).not.toThrow();
    expect(file(files,'styles.css')).toContain('.page_001 { width: 390px;');
    expect(JSON.parse(file(exportDesign(project,page,'json'),'project.luma.json')).version).toBe(2);
  });
});
