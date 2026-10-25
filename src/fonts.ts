import {parse} from 'opentype.js';
import type {DesignNode,EmbeddedFont} from './types';
export const MAX_FONT_BYTES=5_000_000,MAX_FONT_TOTAL=12_000_000,MAX_FONTS=12;
const parsed=new Map<string,any>(),loaded=new Map<string,Promise<void>>();
export function fontBytes(data:string):Uint8Array<ArrayBuffer> {
  if(!/^data:font\/ttf;base64,[a-z\d+/]+={0,2}$/i.test(data)||data.length>MAX_FONT_BYTES*4/3+100)throw Error('TTF 폰트 데이터를 확인해 주세요 (파일당 최대 5MB).');
  const binary=atob(data.slice(data.indexOf(',')+1)),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  if(bytes.length<12||bytes.length>MAX_FONT_BYTES||!((bytes[0]===0&&bytes[1]===1&&bytes[2]===0&&bytes[3]===0)||String.fromCharCode(...bytes.slice(0,4))==='true'))throw Error('올바른 TrueType (.ttf) 폰트가 아닙니다.');
  return bytes;
}
export function validateFonts(value:unknown):EmbeddedFont[] {
  if(!Array.isArray(value)||value.length>MAX_FONTS)throw Error('프로젝트당 최대 12개 폰트를 추가할 수 있습니다.');
  const seen=new Set<string>();let total=0;
  return value.map(font=>{if(!font||typeof font!=='object'||typeof font.data!=='string'||typeof font.family!=='string'||!/^VeloraFont_[a-f\d]{16,64}$/.test(font.family)||seen.has(font.family))throw Error('저장된 폰트 정보가 올바르지 않습니다.');const bytes=fontBytes(font.data);total+=bytes.length;if(total>MAX_FONT_TOTAL)throw Error('프로젝트의 폰트 용량은 합계 12MB까지 지원합니다.');seen.add(font.family);return{id:font.family,family:font.family,name:typeof font.name==='string'?font.name.slice(0,120):'Uploaded font',data:font.data};});
}
function parsedFont(font:EmbeddedFont){if(!parsed.has(font.family)){const bytes=fontBytes(font.data);parsed.set(font.family,parse(bytes.buffer));}return parsed.get(font.family);}
export async function loadFont(font:EmbeddedFont):Promise<void> {
  if(!loaded.has(font.family))loaded.set(font.family,(async()=>{parsedFont(font);const bytes=fontBytes(font.data),face=new FontFace(font.family,bytes.buffer);await face.load();document.fonts.add(face);})().catch(error=>{loaded.delete(font.family);throw error;}));
  return loaded.get(font.family)!;
}
export async function loadProjectFonts(fonts:EmbeddedFont[]=[]){await Promise.all(fonts.map(loadFont));}
export async function importTtf(file:File,current:EmbeddedFont[]=[]):Promise<EmbeddedFont> {
  if(!/\.ttf$/i.test(file.name)||file.size>MAX_FONT_BYTES)throw Error('5MB 이하의 .ttf 파일을 선택하세요.');
  const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(b=>b.toString(16).padStart(2,'0')).join(''),family='VeloraFont_'+hash.slice(0,24),existing=current.find(f=>f.family===family);if(existing){await loadFont(existing);return existing;}
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const font={id:family,family,name:file.name.replace(/\.ttf$/i,'').slice(0,120),data:'data:font/ttf;base64,'+btoa(binary)};
  validateFonts([...current,font]);parsedFont(font);await loadFont(font);return font;
}
export function fontCss(fonts:EmbeddedFont[]=[]):string {
  return validateFonts(fonts).map(font=>`@font-face{font-family:${font.family};src:url("${font.data}") format("truetype");font-weight:100 900;font-style:normal;font-display:block;}`).join('\n');
}
/** Imported fonts become paths in SVG/PNG/GIF, so exported images never depend on installed fonts. */
export function fontOutline(fonts:EmbeddedFont[]|undefined,n:DesignNode):string|null {
  const embedded=fonts?.find(f=>f.family===n.fontFamily);if(!embedded)return null;
  let font:any;try{font=parsedFont(embedded);}catch{return null;}
  const size=n.fontSize,lineHeight=size*(n.lineHeight||1.2),lines=n.text.split('\n'),align=n.textAlign||(n.type==='button'?'center':'left'),vertical=n.verticalAlign||(n.type==='button'?'center':'top');
  const center=vertical==='top'?lineHeight/2:vertical==='bottom'?n.height-(lines.length-.5)*lineHeight:n.height/2-(lines.length-1)*lineHeight/2;
  const baseline=center+(font.ascender+font.descender)/font.unitsPerEm*size/2;
  const options={kerning:true,letterSpacing:(n.letterSpacing||0)/size};
  return lines.map((text,i)=>{const width=font.getAdvanceWidth(text,size,options),x=align==='center'?(n.width-width)/2:align==='right'?n.width-width:0,path=font.getPath(text,x,baseline+i*lineHeight,size,options),decoration=n.textDecoration==='underline'||n.textDecoration==='line-through'?`<rect x="${x}" y="${baseline+i*lineHeight+(n.textDecoration==='underline'?size*.12:-size*.28)}" width="${width}" height="${Math.max(1,size*.045)}"/>`:'';return `<path d="${path.toPathData(3)}"${n.fontStyle==='italic'?` transform="translate(${(baseline+i*lineHeight)*.18} 0) skewX(-10.2)"`:''}/>${decoration}`;}).join('');
}
