import type { DesignNode, DesignPage, DesignProject, ExportFile, ExportFormat } from './types';
import { flattenPage, resolvePage } from './model';
import { wpfExport } from './export-wpf';
import {paintCss,gradientStops} from './paint';
import {fontCss,fontOutline} from './fonts';

/** Exporters deliberately use generated identifiers: layer names and text are never code. */
type Color = { r: number; g: number; b: number; a: number };
type Layer = DesignNode & { key: string };
const NOTES: Record<ExportFormat, string[]> = {
  xaml: ['Windows WPF용 실행 가능한 .NET 10 프로젝트를 생성합니다. dotnet run으로 실행하고 Screen.xaml을 기존 프로젝트에 옮길 수 있습니다.', '계층·오토레이아웃을 고정 좌표로 계산합니다. 일반 모션 프리셋은 Storyboard로 옮기며 사용자 키프레임·부모 연쇄 모션·글래스·부모 클리핑·블렌드는 단순화됩니다.', '이미지는 자리 표시자이며 실제 리소스와 버튼 동작을 연결해야 합니다. WinUI XAML과는 다른 WPF 형식입니다.'],
  html: ['index.html은 현재 화면, page_*.html은 다른 아트보드입니다. styles.css와 runtime.js를 같은 폴더에 두세요.', '중첩 그룹과 자동 레이아웃은 HTML/CSS로, 화면 이동·오버레이·닫기는 runtime.js로 연결됩니다. 반응형 서비스 동작은 추가 개발이 필요합니다.', '그라디언트·스트로크·벡터·타이포그래피·키프레임은 CSS/SVG로 표현합니다. 글래스는 backdrop-filter 근사이며 실제 광학 굴절은 아닙니다.'],
  react: ['React 프로젝트에 Screen.jsx와 추가 Screen*.jsx, styles.css를 함께 넣으세요. 가져온 TTF 폰트는 styles.css에 포함됩니다.', '중첩 그룹과 자동 레이아웃을 보존합니다. data-luma-* 프로토타입 속성은 앱 라우터에서 연결하세요. React 내비게이션 런타임은 포함하지 않습니다.', '그라디언트·벡터·CSS 키프레임을 포함합니다. 글래스는 CSS backdrop-filter로 근사합니다.'],
  xml: ['Android 프로젝트의 app/src/main/res에 res 폴더 내용을 복사하세요. 화면 크기와 좌표는 px 값을 dp로, 글자 크기는 sp로 옮깁니다.', '블러와 글래스는 반투명 배경으로 근사합니다. 실제 배경 블러와 리퀴드 굴절은 포함되지 않습니다.', '이미지 레이어는 자리 표시자로 내보냅니다. 원본 이미지를 drawable에 추가한 뒤 ImageView의 src를 연결하세요.', 'XML 애니메이션은 동봉한 ScreenActivity.kt의 적용 예제로 시작합니다. 화면 이동과 서비스 동작은 직접 연결하세요.', '그림자는 Android elevation으로 근사하며 부모 영역에서 잘릴 수 있습니다.'],
  compose: ['Jetpack Compose Material3 프로젝트용 코드입니다. Screen.kt의 package를 앱 패키지에 맞추세요.', '좌표와 크기는 dp, 글자 크기는 sp로 옮깁니다. 배경 블러와 리퀴드 글래스는 반투명 배경으로 근사합니다.', '레이어 블러는 Modifier.blur를 사용하며 Android 12 이상에서 표시됩니다. 그림자는 Compose shadow로 근사합니다.', 'PNG/JPEG/WebP 데이터 이미지는 코드에 포함됩니다. 서비스 동작과 화면 이동은 직접 연결하세요.'],
  svg: ['SVG는 원본 크기의 정적 벡터 이미지입니다. 자동 레이아웃과 부모 변환을 계산하고 그라디언트·스트로크·벡터·부모 클리핑을 보존합니다.', '레이어 블러와 그림자는 SVG 필터로, 글래스는 반투명 색상으로 근사합니다. 배경 블러, 굴절, UI 모션과 프로토타입 동작은 포함되지 않습니다.', '가져온 TTF 폰트는 벡터 경로로 보존합니다. 그 외 텍스트는 설치된 글꼴을 사용하며 환경에 따라 달라질 수 있습니다.'],
  json: ['현재 프로젝트 전체를 Velora 편집용 JSON으로 저장합니다. 숨긴 레이어도 포함되어 다시 편집할 수 있습니다.'],
};

export function notesForFormat(format: ExportFormat): string[] { return [...NOTES[format], ...(['xml','compose'].includes(format)?['계층·자동 레이아웃·부모 투명도는 계산된 고정 좌표로 변환합니다. 부모 클리핑·혼합 모드·커스텀 키프레임·프로토타입 동작은 Android에서 별도 연결해야 합니다. 그라디언트와 그림자 방향은 플랫폼 기능으로 근사합니다.']:[])]; }

function finite(value: unknown, fallback = 0, min = -100000, max = 100000): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function num(value: number): string { return Number(value.toFixed(3)).toString(); }
function color(value: string, fallback = '#6366f1'): Color {
  let h = typeof value === 'string' ? value.trim() : '';
  if (h === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) h = fallback;
  h = h.slice(1);
  if (h.length <= 4) h = h.split('').map(c => c + c).join('');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}
function cssColor(value: string): string {
  const c = color(value); return `rgba(${c.r}, ${c.g}, ${c.b}, ${num(c.a)})`;
}
function hex(value: number): string { return Math.round(value).toString(16).padStart(2, '0'); }
function androidColor(value: string): string {
  const c = color(value); return `#${hex(c.a * 255)}${hex(c.r)}${hex(c.g)}${hex(c.b)}`.toUpperCase();
}
function kotlinColor(value: string): string { return `Color(0x${androidColor(value).slice(1)})`; }
function withGlass(value: string, _glass: boolean): string {
  // Transparency is already part of the layer opacity and color alpha in the editor.
  const c = color(value); return `#${hex(c.r)}${hex(c.g)}${hex(c.b)}${hex(c.a * 255)}`;
}
function xml(value: string): string {
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '\ufffd').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function jsString(value: string): string { return JSON.stringify(String(value)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
function kotlinString(value: string): string {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}"`;
}
function androidString(value: string): string {
  // The quotes also preserve leading/trailing spaces in Android string resources.
  return `"${xml(String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\r/g, '').replace(/\n/g, '\\n').replace(/\t/g, '\\t'))}"`;
}
/** No network requests, active SVG, file URLs, or arbitrary data MIME types. */
function safeImage(value?: string): string | undefined {
  return typeof value === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(value) ? value : undefined;
}
function layer(node: DesignNode, index: number): Layer {
  return { ...node, key: `node_${String(index + 1).padStart(3, '0')}`, name: String(node.name ?? ''), text: String(node.text ?? ''),
    x: finite(node.x), y: finite(node.y), width: finite(node.width, 1, 0, 16384), height: finite(node.height, 1, 0, 16384),
    radius: finite(node.radius, 0, 0, 8192), fontSize: finite(node.fontSize, 16, 1, 2048), fontWeight: finite(node.fontWeight, 400, 100, 900),
    opacity: finite(node.opacity, 1, 0, 1), rotation: finite(node.rotation, 0, -36000, 36000), blur: finite(node.blur, 0, 0, 200),
    duration: finite(node.duration, 2, 0.1, 120), image: safeImage(node.image),
    animation: ['none', 'float', 'pulse', 'fade', 'slide'].includes(node.animation) ? node.animation : 'none',
  };
}
function visible(page: DesignPage): Layer[] {
  const local=new Map(resolvePage(page).nodes.map(n=>[n.id,n]));
  return flattenPage(page).nodes.filter(n=>n.visible).map((n,i)=>{
    const scale=n.width/Math.max(local.get(n.id)?.width||n.width,1);
    return layer({...n,fontSize:n.fontSize*scale,radius:n.radius*scale,cornerRadii:n.cornerRadii?.map(r=>r*scale) as DesignNode['cornerRadii'],blur:n.blur*scale,letterSpacing:(n.letterSpacing||0)*scale,strokeWidth:(n.strokeWidth||0)*scale,shadowX:(n.shadowX||0)*scale,shadowY:(n.shadowY??12)*scale,shadowBlur:(n.shadowBlur??28)*scale},i);
  });
}
function pageSize(page: DesignPage): { w: number; h: number } { return { w: finite(page.width, 390, 1, 16384), h: finite(page.height, 844, 1, 16384) }; }
function readme(project: DesignProject, page: DesignPage, format: ExportFormat): ExportFile {
  return { name: 'README.txt', content: `Velora — ${project.name}\n${page.name}\n\n${notesForFormat(format).map(n => `• ${n}`).join('\n')}\n\nGenerated from Velora.\n` };
}

function family(n: DesignNode): string { return /^[\p{L}\p{N} _,.-]{1,160}$/u.test(n.fontFamily || '') ? n.fontFamily! : 'Segoe UI, sans-serif'; }
function pathData(n: DesignNode): string { if(n.type==='ellipse')return 'M50 0 A50 50 0 1 0 50 100 A50 50 0 1 0 50 0 Z';return /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]{1,24000}$/.test(n.vectorPath || '') ? n.vectorPath! : 'M10 75 C25 10 75 90 90 25'; }
function shapeNode(n:DesignNode):boolean { return ['line','polygon','vector'].includes(n.type)||(n.type==='ellipse'&&!!n.strokeDash?.length); }
function gradient(n:DesignNode):string { return n.fillType==='linear'&&n.gradient&&!n.gradient.stops ? `linear-gradient(${num(finite(n.gradient.angle,90,-360,360))}deg, ${cssColor(n.gradient.from)}, ${cssColor(n.gradient.to)})` : (n.fillType==='linear'||n.fillType==='radial')&&n.gradient?paintCss(n):cssColor(n.fill); }
function gradientSvg(n:DesignNode,id:string,react=false):string {if(!n.gradient)return '';const stops=gradientStops(n.gradient).map(s=>`<stop offset="${num(s.position)}" ${react?'stopColor':'stop-color'}="${cssColor(s.color)}" />`).join('');if(n.fillType==='radial')return `<radialGradient id="${id}" cx=".5" cy=".5" r=".7071">${stops}</radialGradient>`;const rad=finite(n.gradient.angle,90)*Math.PI/180,dx=Math.sin(rad)/2,dy=-Math.cos(rad)/2;return `<linearGradient id="${id}" x1="${num(.5-dx)}" y1="${num(.5-dy)}" x2="${num(.5+dx)}" y2="${num(.5+dy)}">${stops}</linearGradient>`;}
function fontFiles(files:ExportFile[],project:DesignProject):ExportFile[]{const faces=fontCss(project.fonts);return files.map(f=>f.name.endsWith('.css')?{...f,content:faces+'\n'+f.content}:f);}
function stroke(n:DesignNode):string { return cssColor(n.stroke || (n.type==='line' ? n.fill : 'transparent')); }
function corners(n:DesignNode):string { return n.cornerRadii?.length===4 ? n.cornerRadii.map(v=>`${num(finite(v,0,0,8192))}px`).join(' ') : `${num(n.radius)}px`; }
function svgGeometry(n:DesignNode,attrs=''):string {
  const w=n.width,h=n.height;
  if(n.type==='ellipse')return `<ellipse cx="${num(w/2)}" cy="${num(h/2)}" rx="${num(w/2)}" ry="${num(h/2)}" ${attrs} />`;
  if(n.cornerRadii){const [a,b,c,d]=n.cornerRadii.map(v=>Math.max(0,Math.min(w/2,h/2,finite(v))));return `<path d="M${num(a)} 0 H${num(w-b)} Q${num(w)} 0 ${num(w)} ${num(b)} V${num(h-c)} Q${num(w)} ${num(h)} ${num(w-c)} ${num(h)} H${num(d)} Q0 ${num(h)} 0 ${num(h-d)} V${num(a)} Q0 0 ${num(a)} 0 Z" ${attrs} />`;}
  return `<rect width="${num(w)}" height="${num(h)}" rx="${num(n.radius)}" ${attrs} />`;
}
function duration(n:DesignNode):number { return Math.max(.1,finite(n.duration,2,.1,120)); }
function shadow(n:DesignNode):string { return `${num(finite(n.shadowX,0))}px ${num(finite(n.shadowY,12))}px ${num(finite(n.shadowBlur,28,0,300))}px ${cssColor(n.shadowColor||'#0F172A2E')}`; }
function css(page: DesignPage, nodes: Layer[], pageKey=''): string {
  const { w, h } = pageSize(page);
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const generatedKeyframes:string[]=[];
  const rules=nodes.map(n=>{
    const parent=n.parentId?byId.get(n.parentId):undefined;
    const managed=parent?.layout&&parent.layout.direction!=='none';
    const align=n.textAlign || (n.type==='text'?'left':'center');
    const vertical=n.verticalAlign || (n.type==='text'?'top':'center');
    const justify=align==='left'?'flex-start':align==='right'?'flex-end':'center';
    const alignItems=vertical==='top'?'flex-start':vertical==='bottom'?'flex-end':'center';
    const layout=n.layout&&n.layout.direction!=='none'?n.layout:undefined;
    const easing=['linear','ease','ease-in','ease-out','ease-in-out'].includes(n.easing||'')?n.easing:'ease-in-out';
    let animation='';
    if(n.keyframes?.length){
      const frames=[...n.keyframes].filter(k=>Number.isFinite(k.time)).sort((a,b)=>a.time-b.time);
      generatedKeyframes.push(`@keyframes luma-${n.key} { ${frames.map(k=>`${num(Math.max(0,Math.min(100,k.time/duration(n)*100)))}% { transform: rotate(${num(finite(k.rotation,n.rotation))}deg) translate(${num(finite(k.x,n.x)-n.x)}px, ${num(finite(k.y,n.y)-n.y)}px) scale(${num(finite(k.scale,1,.01,20))}); opacity: ${num(finite(k.opacity,n.opacity,0,1))}; }`).join(' ')} }`);
      animation=`animation: luma-${n.key} ${num(duration(n))}s ${easing} ${num(finite(n.delay,0,0,120))}s infinite;`;
    }else if(n.animation!=='none')animation=`animation: luma-${n.animation} ${num(duration(n))}s ${easing} ${num(finite(n.delay,0,0,120))}s infinite;`;
    return `.${n.key} {\n  ${managed?'position: relative; left: auto; top: auto; flex-shrink: 0;':`left: ${num(n.x)}px; top: ${num(n.y)}px;`} width: ${num(n.width)}px; height: ${num(n.height)}px;\n  background: ${shapeNode(n)?'transparent':gradient(n)}; color: ${cssColor(n.color)};\n  border-radius: ${n.type==='ellipse'?'50%':corners(n)}; --node-opacity: ${num(n.opacity)}; opacity: var(--node-opacity);\n  --backdrop-blur: ${num(n.blur||16)}px; --rotation: ${num(n.rotation)}deg; transform: rotate(var(--rotation)) scale(${num(finite(n.scale,1,.01,20))});\n  font-family: ${family(n)}; font-size: ${num(n.fontSize)}px; font-weight: ${num(n.fontWeight)}; font-style: ${n.fontStyle==='italic'?'italic':'normal'}; text-decoration: ${['underline','line-through'].includes(n.textDecoration||'')?n.textDecoration:'none'}; line-height: ${num(finite(n.lineHeight,1.2,.5,4))}; letter-spacing: ${num(finite(n.letterSpacing,0,-20,100))}px;\n  align-items: ${alignItems}; justify-content: ${justify}; text-align: ${align};\n  overflow: ${n.clipContent||n.type==='image'?'hidden':'visible'}; mix-blend-mode: ${['normal','multiply','screen','overlay'].includes(n.blendMode||'')?n.blendMode:'normal'};${n.strokeWidth&&!shapeNode(n)?`\n  border: ${num(finite(n.strokeWidth,0,0,100))}px solid ${stroke(n)};`:n.glass?'\n  border: 1px solid rgba(255,255,255,.45);':''}${n.shadow?`\n  box-shadow: ${shadow(n)};`:''}${!n.glass&&n.blur?`\n  --node-blur: ${num(n.blur)}px; filter: blur(var(--node-blur));`:''}${n.glass?'\n  backdrop-filter: blur(var(--backdrop-blur)) saturate(160%); -webkit-backdrop-filter: blur(var(--backdrop-blur)) saturate(160%);':''}${layout?`\n  display: flex; flex-direction: ${layout.direction==='horizontal'?'row':'column'}; gap: ${num(finite(layout.gap,0,0,1000))}px; padding: ${num(finite(layout.padding,0,0,1000))}px; align-items: ${layout.align==='start'?'flex-start':layout.align==='end'?'flex-end':'center'}; justify-content: ${layout.justify==='start'?'flex-start':layout.justify==='end'?'flex-end':layout.justify};`:''}${managed&&n.sizing?.horizontal==='fill'?parent?.layout?.direction==='horizontal'?'\n  flex: 1; min-width: 0;':'\n  width: 100%;':''}${managed&&n.sizing?.vertical==='fill'?parent?.layout?.direction==='vertical'?'\n  flex: 1; min-height: 0;':'\n  height: 100%;':''}${n.type==='image'?'\n  object-fit: cover;':''}${n.interaction?'\n  cursor: pointer;':''}\n  ${animation}\n}`;
  });
  return `${pageKey?'':`* { box-sizing: border-box; }\nhtml, body, #root { margin: 0; min-height: 100%; }\nbody { background: #e8ebf1; font-family: "Segoe UI", sans-serif; }\n.luma-artboard { position: relative; overflow: hidden; isolation: isolate; }\n.design-node { position: absolute; display: flex; align-items: center; padding: 0; border: 0; margin: 0; font-family: inherit; line-height: 1.2; white-space: pre-wrap; overflow-wrap: anywhere; transform-origin: center; }\n.design-node > .node-text { width: 100%; pointer-events: none; }\n.vector-shape { width: 100%; height: 100%; overflow: visible; }\nbutton.design-node { cursor: pointer; transition: filter 150ms ease; }\nbutton.design-node:active { filter: blur(var(--node-blur, 0px)) brightness(.86); }\nbutton.design-node:focus-visible { outline: 3px solid #7065ef; outline-offset: 3px; }\n.prototype-overlay { position: fixed; inset: 0; border: 0; width: 100vw; height: 100vh; z-index: 9999; background: #15171c88; }\n`}
.${pageKey||'luma-artboard'} { width: ${num(w)}px; height: ${num(h)}px; background: ${cssColor(page.background)}; }\n${rules.join('\n')}\n${generatedKeyframes.join('\n')}\n`;
}
const COMMON_MOTION=`@keyframes luma-float { 0%,100% { transform: rotate(var(--rotation)) translateY(0); } 50% { transform: rotate(var(--rotation)) translateY(-10px); } }\n@keyframes luma-pulse { 0%,100% { transform: rotate(var(--rotation)) scale(1); } 50% { transform: rotate(var(--rotation)) scale(1.045); } }\n@keyframes luma-fade { 0%,100% { opacity: var(--node-opacity); } 50% { opacity: calc(var(--node-opacity) * .35); } }\n@keyframes luma-slide { 0%,100% { transform: rotate(var(--rotation)) translateX(0); } 50% { transform: rotate(var(--rotation)) translateX(16px); } }\n@media (prefers-reduced-motion: reduce) { .design-node { animation: none !important; transition: none !important; } }\n`;
const RUNTIME=`'use strict';\n(() => {\n  const activate = (element) => {\n    const action = element.dataset.lumaAction;\n    const transition = element.dataset.lumaTransition;\n    const duration = Math.max(0, Math.min(10000, Number(element.dataset.lumaDuration || 0) * 1000));\n    const target = element.dataset.lumaTarget;\n    if (action === 'close') { window.parent.postMessage({ type: 'luma:close-overlay' }, '*'); return; }\n    if (!/^page_\\d+\\.html$|^index\\.html$/.test(target || '')) return;\n    if (action === 'overlay') {\n      document.querySelector('.prototype-overlay')?.remove();\n      const frame = document.createElement('iframe'); frame.className = 'prototype-overlay'; frame.title = 'Prototype overlay'; frame.src = target;\n      document.body.append(frame);\n      if (transition !== 'instant' && duration > 0) frame.animate([{ opacity: 0, transform: transition === 'slide' ? 'translateY(20px)' : 'none' }, { opacity: 1, transform: 'none' }], { duration, easing: 'ease-out' });\n    } else if (transition !== 'instant' && duration > 0) {\n      document.body.animate([{ opacity: 1 }, { opacity: 0 }], { duration, fill: 'forwards' }).finished.then(() => { window.location.href = target; });\n    } else { window.location.href = target; }\n  };\n  document.addEventListener('click', event => { const el = event.target.closest('[data-luma-action]'); if (el && el.dataset.lumaTrigger !== 'hover') activate(el); });\n  document.addEventListener('pointerover', event => { const el = event.target.closest('[data-luma-action]'); if (el && el.dataset.lumaTrigger === 'hover' && !el.contains(event.relatedTarget)) activate(el); });\n  window.addEventListener('message', event => { const frame = document.querySelector('.prototype-overlay'); if (frame && event.source === frame.contentWindow && event.data?.type === 'luma:close-overlay') frame.remove(); });\n  document.addEventListener('keydown', event => { if (event.key === 'Escape') document.querySelector('.prototype-overlay')?.remove(); });\n})();\n`;
function localLayers(page:DesignPage):Layer[]{
  const active=new Set(flattenPage(page).nodes.filter(n=>n.visible).map(n=>n.id));
  return resolvePage(page).nodes.filter(n=>active.has(n.id)).map(layer);
}
function vectorMarkup(n:Layer,react=false):string{
  let fill=cssColor(n.fill),defs='';
  if(n.fillType!=='solid'&&n.gradient){defs='<defs>'+gradientSvg(n,n.key+'_paint',react)+'</defs>';fill=`url(#${n.key}_paint)`;}
  const paint=n.type==='line'?'none':fill;
  const attr=react?'className':'class';
  const sw=num(finite(n.strokeWidth,n.type==='line'?2:0,0,100));
  const effect=`${react?'vectorEffect':'vector-effect'}="non-scaling-stroke"`;
  const shape=n.type==='line'?`<path d="M0 50 L100 50" ${effect} />`:n.type==='polygon'?`<polygon points="50,0 100,100 0,100" ${effect} />`:`<path d="${xml(pathData(n))}" ${effect} />`;
  return `<svg ${attr}="vector-shape" viewBox="0 0 100 100" preserveAspectRatio="none" fill="${paint}" stroke="${stroke(n)}" ${react?'strokeWidth':'stroke-width'}="${sw}" ${react?'strokeLinecap':'stroke-linecap'}="${n.strokeCap||'butt'}"${n.strokeDash?.length?` ${react?'strokeDasharray':'stroke-dasharray'}="${n.strokeDash.map(v=>num(finite(v,4,.1,1000))).join(' ')}"`:''} aria-hidden="true">${defs}${shape}</svg>`;
}
function htmlExport(project:DesignProject,current:DesignPage,react:boolean):ExportFile[]{
  const ordered=[current,...project.pages.filter(p=>p.id!==current.id)];
  const filenames=new Map(ordered.map((p,i)=>[p.id,i===0?'index.html':`page_${String(i+1).padStart(3,'0')}.html`]));
  let stylesheet='';const files:ExportFile[]=[];
  ordered.forEach((page,pageIndex)=>{
    const pageKey=`page_${String(pageIndex+1).padStart(3,'0')}`;
    const nodes=localLayers(page).map(n=>({...n,key:pageIndex?`${pageKey}_${n.key}`:n.key}));
    stylesheet+=css(page,nodes,pageIndex?pageKey:'');
    const ids=new Set(nodes.map(n=>n.id));
    const children=(parentId?:string):Layer[]=>nodes.filter(n=>parentId?n.parentId===parentId:!n.parentId||!ids.has(n.parentId));
    const render=(n:Layer,seen:Set<string>):string=>{
      if(seen.has(n.id))return '';const next=new Set(seen);next.add(n.id);
      const label=react?`aria-label={${jsString(n.name)}}`:`aria-label="${xml(n.name)}"`;
      const classAttr=react?'className':'class';
      if(n.type==='image'&&n.image)return `<img ${classAttr}="design-node ${n.key}" src=${react?`{${jsString(n.image)}}`:`"${xml(n.image)}"`} alt=${react?`{${jsString(n.name)}}`:`"${xml(n.name)}"`} ${react?'draggable={false}':'draggable="false"'} />`;
      const tag=n.type==='button'?'button':'div';
      const action=n.interaction;const target=action?.targetPageId?filenames.get(action.targetPageId):undefined;
      const attrs=action&&['navigate','overlay','close'].includes(action.action)?` data-luma-action="${action.action}" data-luma-trigger="${action.trigger==='hover'?'hover':'click'}" data-luma-transition="${['fade','slide'].includes(action.transition)?action.transition:'instant'}" data-luma-duration="${num(finite(action.duration,.3,0,10))}"${target?` data-luma-target="${target}"`:''}`:'';
      const content=shapeNode(n)?vectorMarkup(n,react):n.text?`<span ${classAttr}="node-text">${react?`{${jsString(n.text)}}`:xml(n.text)}</span>`:'';
      return `<${tag} ${classAttr}="design-node ${n.key}" ${label}${tag==='button'?' type="button"':''}${attrs}>${content}${children(n.id).map(c=>render(c,next)).join('\n')}</${tag}>`;
    };
    const markup=children().map(n=>render(n,new Set())).join('\n');
    if(react){
      // Each React screen is a component; runtime navigation is delegated to the host application.
      const component=pageIndex===0?'Screen':`Screen${pageIndex+1}`;
      files.push({name:`${component}.jsx`,content:`import React from 'react';\nimport './styles.css';\n\nexport default function ${component}() {\n return (<main className="luma-artboard ${pageKey}" aria-label={${jsString(page.name)}}>\n${markup}\n</main>);\n}\n`});
    }else files.push({name:filenames.get(page.id)!,content:`<!doctype html>\n<html lang="ko"><head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${xml(page.name)} — ${xml(project.name)}</title>\n<link rel="stylesheet" href="styles.css">\n</head><body><main class="luma-artboard ${pageKey}" aria-label="${xml(page.name)}">\n${markup}\n</main>\n<script src="runtime.js" defer></script>\n</body></html>\n`});
  });
  // The primary artboard's dimensions must remain scoped when exporting more than one page.
  stylesheet=stylesheet.replace('.luma-artboard { width:', '.page_001 { width:');
  files.push({name:'styles.css',content:stylesheet+COMMON_MOTION});
  if(!react)files.push({name:'runtime.js',content:RUNTIME});
  files.push(readme(project,current,react?'react':'html'));return files;
}

function xmlShape(n: Layer, pressed = false): string {
  const c = color(withGlass(n.fill, n.glass));
  const fill = pressed ? `#${hex(c.r * .86)}${hex(c.g * .86)}${hex(c.b * .86)}${hex(c.a * 255)}` : withGlass(n.fill, n.glass);
  if(shapeNode(n))return `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${num(n.width)}dp" android:height="${num(n.height)}dp" android:viewportWidth="100" android:viewportHeight="100"><path android:pathData="${xml(n.type==='line'?'M0 50 L100 50':n.type==='polygon'?'M50 0 L100 100 L0 100 Z':pathData(n))}" android:fillColor="${n.type==='line'?'#00000000':androidColor(fill)}" android:strokeColor="${androidColor(n.stroke||'transparent')}" android:strokeWidth="${num(finite(n.strokeWidth,n.type==='line'?2:0,0,100)*100/Math.max(n.width,n.height,1))}" /></vector>`;
  const paint=n.fillType==='linear'&&n.gradient?`<gradient android:startColor="${androidColor(n.gradient.from)}" android:endColor="${androidColor(n.gradient.to)}" android:angle="${((Math.round((90-finite(n.gradient.angle,90))/45)*45)%360+360)%360}" />`:`<solid android:color="${androidColor(fill)}" />`;
  return `<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="${n.type === 'ellipse' ? 'oval' : 'rectangle'}">\n  ${paint}${n.type !== 'ellipse' ? `\n  <corners android:radius="${num(n.radius)}dp" />` : ''}${n.strokeWidth?`\n  <stroke android:width="${num(finite(n.strokeWidth,0,0,100))}dp" android:color="${androidColor(n.stroke||'transparent')}" />`:n.glass ? '\n  <stroke android:width="1dp" android:color="#73FFFFFF" />' : ''}\n</shape>`;
}
function androidAnimation(n: Layer): string {
  const duration = Math.round(n.duration * 1000 / 2);
  const common = `android:duration="${duration}" android:repeatCount="infinite" android:repeatMode="reverse" android:interpolator="@android:anim/accelerate_decelerate_interpolator"`;
  const root = 'xmlns:android="http://schemas.android.com/apk/res/android"';
  if (n.animation === 'fade') return `<alpha ${root} android:fromAlpha="1" android:toAlpha="0.35" ${common} />`;
  if (n.animation === 'pulse') return `<scale ${root} android:fromXScale="1" android:toXScale="1.045" android:fromYScale="1" android:toYScale="1.045" android:pivotX="50%" android:pivotY="50%" ${common} />`;
  // Percentages make animation resources independent of device density.
  return `<translate ${root} android:fromXDelta="0%" android:toXDelta="${n.animation === 'slide' ? '4%' : '0%'}" android:fromYDelta="0%" android:toYDelta="${n.animation === 'float' ? '-2%' : '0%'}" ${common} />`;
}
function androidXmlExport(project: DesignProject, page: DesignPage): ExportFile[] {
  const nodes = visible(page); const { w, h } = pageSize(page); const files: ExportFile[] = [];
  const strings: string[] = [`  <string name="screen_name">${androidString(page.name)}</string>`];
  const views = nodes.map(n => {
    files.push({ name: `res/drawable/${n.key}_background.xml`, content: '<?xml version="1.0" encoding="utf-8"?>\n' + xmlShape(n) + '\n' });
    if (n.type === 'button') {
      files.push({ name: `res/drawable/${n.key}_pressed.xml`, content: '<?xml version="1.0" encoding="utf-8"?>\n' + xmlShape(n, true) + '\n' });
      files.push({ name: `res/drawable/${n.key}_button.xml`, content: `<?xml version="1.0" encoding="utf-8"?>\n<selector xmlns:android="http://schemas.android.com/apk/res/android">\n  <item android:state_pressed="true" android:drawable="@drawable/${n.key}_pressed" />\n  <item android:drawable="@drawable/${n.key}_background" />\n</selector>\n` });
    }
    strings.push(`  <string name="${n.key}_label">${androidString(n.name)}</string>`);
    const hasText = Boolean(n.text) || n.type === 'button' || n.type === 'text';
    if (hasText) strings.push(`  <string name="${n.key}_text">${androidString(n.text)}</string>`);
    if (n.animation !== 'none') files.push({ name: `res/anim/${n.key}_motion.xml`, content: `<?xml version="1.0" encoding="utf-8"?>\n${androidAnimation(n)}\n` });
    const tag = n.type === 'image' ? 'ImageView' : n.type === 'button' ? 'Button' : hasText ? 'TextView' : 'View';
    const attrs = [
      `android:id="@+id/${n.key}"`, `android:layout_width="${num(n.width)}dp"`, `android:layout_height="${num(n.height)}dp"`,
      'android:layout_gravity="top|start"', `android:layout_marginStart="${num(n.x)}dp"`, `android:layout_marginTop="${num(n.y)}dp"`,
      `android:background="@drawable/${n.key}_${n.type === 'button' ? 'button' : 'background'}"`, `android:alpha="${num(n.opacity)}"`, `android:rotation="${num(n.rotation)}"`,
      `android:contentDescription="@string/${n.key}_label"`, 'android:padding="0dp"',
    ];
    const horizontal=n.textAlign==='right'?'end':n.textAlign==='center'?'center_horizontal':n.type==='text'?'start':'center_horizontal';
    const vertical=n.verticalAlign==='bottom'?'bottom':n.verticalAlign==='center'?'center_vertical':n.type==='text'?'top':'center_vertical';
    if (hasText && n.type !== 'image') attrs.push(`android:text="@string/${n.key}_text"`, `android:textColor="${androidColor(n.color)}"`, `android:textSize="${num(n.fontSize)}sp"`, `android:textStyle="${n.fontWeight >= 600 ? 'bold' : 'normal'}"`, `android:gravity="${n.textAlign||n.verticalAlign?`${vertical}|${horizontal}`:n.type === 'text' ? 'top|start' : 'center'}"`, 'android:includeFontPadding="false"', `android:letterSpacing="${num(finite(n.letterSpacing,0,-20,100)/Math.max(n.fontSize,1))}"`, `android:lineSpacingMultiplier="${num(finite(n.lineHeight,1.2,.5,4))}"`);
    if (n.type === 'button') attrs.push('android:textAllCaps="false"', 'android:minWidth="0dp"', 'android:minHeight="0dp"', 'android:stateListAnimator="@null"');
    if (n.type === 'image') attrs.push('android:scaleType="centerCrop"', 'android:clipToOutline="true"');
    if (n.shadow) attrs.push('android:elevation="12dp"');
    return `  <${tag}\n    ${attrs.join('\n    ')} />`;
  }).join('\n\n');
  files.unshift({ name: 'res/layout/screen.xml', content: `<?xml version="1.0" encoding="utf-8"?>\n<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"\n  android:layout_width="${num(w)}dp"\n  android:layout_height="${num(h)}dp"\n  android:layoutDirection="ltr"\n  android:background="${androidColor(page.background)}"\n  android:clipChildren="true"\n  android:contentDescription="@string/screen_name">\n${views}\n</FrameLayout>\n` });
  files.push({ name: 'res/values/strings.xml', content: `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${strings.join('\n')}\n</resources>\n` });
  files.push({ name: 'ScreenActivity.kt', content: `package com.example.lumastudio\n\nimport android.app.Activity\nimport android.os.Bundle\nimport android.view.View\nimport android.view.animation.AnimationUtils\n\n// Register this Activity in AndroidManifest.xml; update this package and R import for your app.\nclass ScreenActivity : Activity() {\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        setContentView(R.layout.screen)\n${nodes.filter(n => n.animation !== 'none').map(n => `        findViewById<View>(R.id.${n.key}).startAnimation(AnimationUtils.loadAnimation(this, R.anim.${n.key}_motion))`).join('\n')}\n    }\n}\n` });
  files.push(readme(project, page, 'xml')); return files;
}

function composeExport(project: DesignProject, page: DesignPage): ExportFile[] {
  const nodes = visible(page); const { w, h } = pageSize(page);
  const layerCode = nodes.map(n => {
    const motion = n.animation !== 'none';
    const shape = n.type === 'ellipse' ? 'CircleShape' : n.cornerRadii?`RoundedCornerShape(topStart = ${num(n.cornerRadii[0])}.dp, topEnd = ${num(n.cornerRadii[1])}.dp, bottomEnd = ${num(n.cornerRadii[2])}.dp, bottomStart = ${num(n.cornerRadii[3])}.dp)`:`RoundedCornerShape(${num(n.radius)}.dp)`;
    const statements: string[] = [];
    if (motion) {
      statements.push(`        val transition = rememberInfiniteTransition(label = "${n.key}")`);
      const target = n.animation === 'pulse' ? '1.045f' : n.animation === 'fade' ? '0.35f' : n.animation === 'float' ? '-10f' : '16f';
      statements.push(`        val motion by transition.animateFloat(initialValue = ${n.animation === 'pulse' || n.animation === 'fade' ? '1f' : '0f'}, targetValue = ${target}, animationSpec = infiniteRepeatable(animation = tween(${Math.round(n.duration * 500)}, easing = FastOutSlowInEasing), repeatMode = RepeatMode.Reverse), label = "motion")`);
    }
    if (n.type === 'image' && n.image) {
      const payload = n.image.slice(n.image.indexOf(',') + 1);
      const encoded = payload.length <= 16000 ? kotlinString(payload) : `listOf(${payload.match(/.{1,16000}/g)!.map(kotlinString).join(', ')}).joinToString("")`;
      statements.push(`        val bitmap = remember { runCatching { val bytes = Base64.decode(${encoded}, Base64.DEFAULT); BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap() }.getOrNull() }`);
    }
    if (n.type === 'button') statements.push('        var pressed by remember { mutableStateOf(false) }');
    const modifiers = [`.offset(x = ${num(n.x)}.dp, y = ${num(n.y)}.dp)`, `.size(width = ${num(n.width)}.dp, height = ${num(n.height)}.dp)`,
      `.graphicsLayer {\n                    rotationZ = ${num(n.rotation)}f\n                    alpha = ${num(n.opacity)}f${n.animation === 'fade' ? ' * motion' : ''}\n${n.animation === 'pulse' ? '                    scaleX = motion\n                    scaleY = motion\n' : ''}${n.animation === 'float' ? '                    translationY = motion * density\n' : ''}${n.animation === 'slide' ? '                    translationX = motion * density\n' : ''}                }`];
    if (n.shadow) modifiers.push(`.shadow(${num(finite(n.shadowBlur,24,0,200)/2)}.dp, shape = ${shape})`);
    if (!n.glass && n.blur) modifiers.push(`.blur(${num(n.blur)}.dp)`);
    modifiers.push(`.clip(${shape})`);
    if(!shapeNode(n)) modifiers.push(n.fillType==='linear'&&n.gradient?`.background(Brush.linearGradient(listOf(${kotlinColor(n.gradient.from)}, ${kotlinColor(n.gradient.to)})))`:`.background(${kotlinColor(withGlass(n.fill, n.glass))})`);
    if(n.strokeWidth&&!shapeNode(n))modifiers.push(`.border(${num(finite(n.strokeWidth,0,0,100))}.dp, ${kotlinColor(n.stroke||'transparent')}, ${shape})`);
    else if (n.glass) modifiers.push(`.border(1.dp, Color.White.copy(alpha = 0.45f), ${shape})`);
    if (n.type === 'button') modifiers.push('.clickable { pressed = !pressed }');
    modifiers.push(`.semantics { contentDescription = ${kotlinString(n.name)} }`);
    const children: string[] = [];
    if(shapeNode(n)){
      const d=n.type==='line'?'M0 50 L100 50':n.type==='polygon'?'M50 0 L100 100 L0 100 Z':pathData(n);
      const normalizedStroke=num(finite(n.strokeWidth,n.type==='line'?2:0,0,100)*100/Math.max(n.width,n.height,1));
      children.push(`            Canvas(Modifier.fillMaxSize()) {\n                val path = PathParser().parsePathString(${kotlinString(d)}).toPath()\n                scale(size.width / 100f, size.height / 100f, pivot = Offset.Zero) {\n${n.type==='line'?'':`                    drawPath(path, ${kotlinColor(n.fill)})\n`}${Number(normalizedStroke)>0?`                    drawPath(path, ${kotlinColor(n.stroke||'#172424')}, style = Stroke(width = ${normalizedStroke}f))\n`:''}                }\n            }`);
    }
    if (n.type === 'image' && n.image) children.push(`            bitmap?.let { Image(bitmap = it, contentDescription = ${kotlinString(n.name)}, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }`);
    const horizontal=n.textAlign||(n.type==='text'?'left':'center');const vertical=n.verticalAlign||(n.type==='text'?'top':'center');
    const alignment=vertical==='top'?(horizontal==='left'?'TopStart':horizontal==='right'?'TopEnd':'TopCenter'):vertical==='bottom'?(horizontal==='left'?'BottomStart':horizontal==='right'?'BottomEnd':'BottomCenter'):(horizontal==='left'?'CenterStart':horizontal==='right'?'CenterEnd':'Center');
    if (n.text || n.type === 'image' && !n.image) children.push(`            Text(text = ${kotlinString(n.text || 'Image')}, color = ${kotlinColor(n.color)}, fontSize = ${num(n.fontSize)}.sp, lineHeight = ${num(n.fontSize * finite(n.lineHeight,1.2,.5,4))}.sp, letterSpacing = ${num(finite(n.letterSpacing,0,-20,100))}.sp, fontFamily = FontFamily.${/mono/i.test(n.fontFamily||'')?'Monospace':/serif/i.test(n.fontFamily||'')&&!/sans/i.test(n.fontFamily||'')?'Serif':'SansSerif'}, fontWeight = FontWeight(${Math.round(n.fontWeight)}), textAlign = TextAlign.${horizontal==='left'?'Left':horizontal==='right'?'Right':'Center'}, modifier = Modifier.fillMaxWidth()${n.type === 'button' ? '.graphicsLayer { alpha = if (pressed) 0.7f else 1f }' : ''})`);
    return `    key("${n.key}") {\n${statements.join('\n')}${statements.length ? '\n' : ''}        Box(\n            modifier = Modifier\n                ${modifiers.join('\n                ')},\n            contentAlignment = Alignment.${alignment}\n        ) {\n${children.join('\n')}\n        }\n    }`;
  }).join('\n');
  const content = `package com.example.lumastudio\n\nimport android.graphics.BitmapFactory\nimport android.util.Base64\nimport androidx.compose.animation.core.FastOutSlowInEasing\nimport androidx.compose.animation.core.RepeatMode\nimport androidx.compose.animation.core.animateFloat\nimport androidx.compose.animation.core.infiniteRepeatable\nimport androidx.compose.animation.core.rememberInfiniteTransition\nimport androidx.compose.animation.core.tween\nimport androidx.compose.foundation.Image\nimport androidx.compose.foundation.background\nimport androidx.compose.foundation.border\nimport androidx.compose.foundation.clickable\nimport androidx.compose.foundation.layout.Box\nimport androidx.compose.foundation.layout.fillMaxSize\nimport androidx.compose.foundation.layout.fillMaxWidth\nimport androidx.compose.foundation.layout.offset\nimport androidx.compose.foundation.layout.size\nimport androidx.compose.foundation.shape.CircleShape\nimport androidx.compose.foundation.shape.RoundedCornerShape\nimport androidx.compose.material3.Text\nimport androidx.compose.runtime.Composable\nimport androidx.compose.runtime.getValue\nimport androidx.compose.runtime.key\nimport androidx.compose.runtime.mutableStateOf\nimport androidx.compose.runtime.remember\nimport androidx.compose.runtime.setValue\nimport androidx.compose.ui.Alignment\nimport androidx.compose.ui.Modifier\nimport androidx.compose.ui.draw.blur\nimport androidx.compose.ui.draw.clip\nimport androidx.compose.ui.draw.shadow\nimport androidx.compose.ui.graphics.Color\nimport androidx.compose.ui.graphics.asImageBitmap\nimport androidx.compose.ui.graphics.graphicsLayer\nimport androidx.compose.ui.layout.ContentScale\nimport androidx.compose.ui.semantics.contentDescription\nimport androidx.compose.ui.semantics.semantics\nimport androidx.compose.ui.text.font.FontWeight\nimport androidx.compose.ui.text.style.TextAlign\nimport androidx.compose.ui.unit.dp\nimport androidx.compose.ui.unit.sp\n\n/** Fixed-size artboard. Preview inside a horizontally/vertically scrollable host if needed. */\n@Composable\nfun LumaScreen(modifier: Modifier = Modifier) {\n    Box(modifier = modifier.size(${num(w)}.dp, ${num(h)}.dp).clip(RoundedCornerShape(0.dp)).background(${kotlinColor(page.background)})) {\n${layerCode}\n    }\n}\n`;
  const imports='import androidx.compose.foundation.Canvas\nimport androidx.compose.ui.graphics.Brush\nimport androidx.compose.ui.geometry.Offset\nimport androidx.compose.ui.graphics.drawscope.Stroke\nimport androidx.compose.ui.graphics.drawscope.scale\nimport androidx.compose.ui.graphics.vector.PathParser\nimport androidx.compose.ui.text.font.FontFamily\n';
  return [{ name: 'Screen.kt', content:content.replace('import android.graphics.BitmapFactory',imports+'import android.graphics.BitmapFactory') }, readme(project, page, 'compose')];
}

function svgExport(project: DesignProject, page: DesignPage): ExportFile[] {
  const nodes=visible(page);const {w,h}=pageSize(page);const defs:string[]=[];const byId=new Map(nodes.map(n=>[n.id,n]));
  for(const n of nodes){if(n.clipContent)defs.push(`<clipPath id="${n.key}_parent_clip" clipPathUnits="userSpaceOnUse" transform="translate(${num(n.x)} ${num(n.y)}) rotate(${num(n.rotation)} ${num(n.width/2)} ${num(n.height/2)})">${svgGeometry(n)}</clipPath>`);}
  const shapes=nodes.map(n=>{
    const cx=n.width/2,cy=n.height/2;let fill=cssColor(n.fill);let filter='';
    if(n.fillType!=='solid'&&n.gradient){defs.push(gradientSvg(n,n.key+'_gradient'));fill=`url(#${n.key}_gradient)`;}
    if(n.shadow||!n.glass&&n.blur){defs.push(`<filter id="${n.key}_effect" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB">${n.shadow?`<feDropShadow dx="${num(finite(n.shadowX,0))}" dy="${num(finite(n.shadowY,12))}" stdDeviation="${num(finite(n.shadowBlur,28,0,300)/2)}" flood-color="${cssColor(n.shadowColor||'#0F172A2E')}" />`:''}${!n.glass&&n.blur?`<feGaussianBlur stdDeviation="${num(n.blur)}" />`:''}</filter>`);filter=` filter="url(#${n.key}_effect)"`;}
    const outline=`stroke="${stroke(n)}" stroke-width="${num(finite(n.strokeWidth,n.type==='line'?2:0,0,200))}" stroke-linecap="${['butt','round','square'].includes(n.strokeCap||'')?n.strokeCap:'butt'}"${n.strokeDash?.length?` stroke-dasharray="${n.strokeDash.map(v=>num(finite(v,4,.1,1000))).join(' ')}"`:''}`;
    let base=svgGeometry(n,`fill="${fill}" ${outline}`);
    if(shapeNode(n)){const path=n.type==='line'?'M0 50 L100 50':n.type==='polygon'?'M50 0 L100 100 L0 100 Z':pathData(n);base=`<svg width="${num(n.width)}" height="${num(n.height)}" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible"><path d="${xml(path)}" fill="${n.type==='line'?'none':fill}" ${outline} vector-effect="non-scaling-stroke" /></svg>`;}
    const children=[base];
    if(n.type==='image'&&n.image)children.push(`<image href="${xml(n.image)}" width="${num(n.width)}" height="${num(n.height)}" preserveAspectRatio="xMidYMid slice" />`);
    const lines=(n.text||(n.type==='image'&&!n.image?'Image':'')).split('\n');
    const outlines=fontOutline(project.fonts,n);if(outlines!==null)children.push(`<g fill="${cssColor(n.color)}">${outlines}</g>`);
    else if(lines.some(Boolean)){const lineHeight=n.fontSize*finite(n.lineHeight,1.2,.5,4);const vertical=n.verticalAlign||(n.type==='text'?'top':'center'),align=n.textAlign||(n.type==='text'?'left':'center');const start=vertical==='top'?lineHeight/2:vertical==='bottom'?n.height-(lines.length-.5)*lineHeight:cy-(lines.length-1)*lineHeight/2;const tx=align==='left'?0:align==='right'?n.width:cx;children.push(`<text fill="${cssColor(n.color)}" font-family="${xml(family(n))}" font-size="${num(n.fontSize)}" font-weight="${num(n.fontWeight)}" font-style="${n.fontStyle==='italic'?'italic':'normal'}" text-decoration="${['underline','line-through'].includes(n.textDecoration||'')?n.textDecoration:'none'}" letter-spacing="${num(finite(n.letterSpacing,0,-20,100))}" text-anchor="${align==='left'?'start':align==='right'?'end':'middle'}" dominant-baseline="central" xml:space="preserve">${lines.map((line,i)=>`<tspan x="${num(tx)}" y="${num(start+i*lineHeight)}">${xml(line)}</tspan>`).join('')}</text>`);}
    let local=children.join('');
    if(n.clipContent||n.type==='image'){defs.push(`<clipPath id="${n.key}_clip">${svgGeometry(n)}</clipPath>`);local=`<g clip-path="url(#${n.key}_clip)">${local}</g>`;}
    let result=`<g transform="translate(${num(n.x)} ${num(n.y)}) rotate(${num(n.rotation)} ${num(cx)} ${num(cy)})" opacity="${num(n.opacity)}"${filter} style="mix-blend-mode:${['normal','multiply','screen','overlay'].includes(n.blendMode||'')?n.blendMode:'normal'}"><title>${xml(n.name)}</title>${local}</g>`;
    let parent=n.parentId;const seen=new Set<string>();while(parent&&!seen.has(parent)){seen.add(parent);const p=byId.get(parent);if(!p)break;if(p.clipContent)result=`<g clip-path="url(#${p.key}_parent_clip)">${result}</g>`;parent=p.parentId;}
    return result;
  }).join('\n');
  return [{name:'design.svg',content:`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${num(w)}" height="${num(h)}" viewBox="0 0 ${num(w)} ${num(h)}"><title>${xml(page.name)}</title><defs>${defs.join('\n')}</defs><rect width="100%" height="100%" fill="${cssColor(page.background)}" />\n${shapes}\n</svg>\n`},readme(project,page,'svg')];
}

export function exportDesign(project: DesignProject, page: DesignPage, format: ExportFormat): ExportFile[] {
  switch (format) {
    case 'xaml': return wpfExport(project, page);
    case 'html': return fontFiles(htmlExport(project, page, false),project);
    case 'react': return fontFiles(htmlExport(project, page, true),project);
    case 'xml': return androidXmlExport(project, page);
    case 'compose': return composeExport(project, page);
    case 'svg': return svgExport(project, page);
    case 'json': return [{ name: 'project.luma.json', content: JSON.stringify(project, null, 2) + '\n' }];
    default: throw new Error(`Unsupported export format: ${String(format)}`);
  }
}




