import type {DesignProject,DesignPage,ExportFile} from './types';
import {exportDesign} from './exporters';
import {flattenPage} from './model';
import {pptxColor} from './export-utils';
export const safeName=(s:string)=>s.replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,80)||'design';
export function download(name:string,blob:Blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);}
export async function saveBinary(name:string,blob:Blob){if(window.desktop)return window.desktop.saveBinary(name,Array.from(new Uint8Array(await blob.arrayBuffer())));download(name,blob);return{ok:true};}
export async function saveFiles(name:string,files:ExportFile[]){if(window.desktop)return window.desktop.exportFiles(files);const{default:JSZip}=await import('jszip');const zip=new JSZip();files.forEach(f=>zip.file(f.name,f.content));download(`${safeName(name)}.zip`,await zip.generateAsync({type:'blob'}));return{ok:true};}
export async function renderPng(project:DesignProject,page:DesignPage,scale=1){
 const maxPixels=32_000_000;const s=Math.min(2,Math.max(.1,scale),Math.sqrt(maxPixels/(page.width*page.height)));
 const svg=exportDesign(project,page,'svg').find(f=>f.name.endsWith('.svg'))!.content;
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const image=new Image();
 try{await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('화면 이미지를 생성할 수 없습니다.'));image.src=url;});
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(page.width*s));canvas.height=Math.max(1,Math.round(page.height*s));canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
 const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('이미지 변환 실패');
 const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
 return{blob,data,mimeType:'image/png' as const,width:canvas.width,height:canvas.height};
 }finally{URL.revokeObjectURL(url);}
}
export async function pptxBlob(project:DesignProject){
 const{default:PptxGenJS}=await import('pptxgenjs');const pptx=new PptxGenJS();pptx.defineLayout({name:'LUMA',width:13.333,height:7.5});pptx.layout='LUMA';pptx.author='Velora';pptx.title=project.name;
 for(const source of project.pages){const p=flattenPage(source),s=pptx.addSlide();s.background={color:p.background==='transparent'?'FFFFFF':pptxColor(p.background).color};const k=Math.min(13.333/p.width,7.5/p.height),ox=(13.333-p.width*k)/2,oy=(7.5-p.height*k)/2;
  for(const n of p.nodes.filter(n=>n.visible)){
   if(n.type==='group')continue;const opts={x:ox+n.x*k,y:oy+n.y*k,w:n.width*k,h:n.height*k,rotate:n.rotation,transparency:(1-n.opacity)*100};
   if(n.type==='image'&&n.image){s.addImage({...opts,data:n.image});continue;}
   if(n.type==='line'){s.addShape(pptx.ShapeType.line,{...opts,line:{color:pptxColor(n.stroke||n.color).color,width:(n.strokeWidth||2)*k*72,transparency:pptxColor(n.stroke||n.color,n.opacity).transparency}});continue;}
   if(n.fill!=='transparent'||n.strokeWidth){s.addShape(n.type==='ellipse'?pptx.ShapeType.ellipse:n.type==='polygon'?pptx.ShapeType.triangle:n.radius>0?pptx.ShapeType.roundRect:pptx.ShapeType.rect,{...opts,rectRadius:n.radius*k,fill:pptxColor(n.fillType==='linear'?n.gradient?.from||n.fill:n.fill,n.opacity),line:n.strokeWidth?{color:pptxColor(n.stroke||'#000').color,width:n.strokeWidth*k*72,transparency:pptxColor(n.stroke||'#000',n.opacity).transparency}:{transparency:100}});}
   if(n.text)s.addText(n.text,{...opts,fontFace:n.fontFamily?.split(',')[0].replace(/["']/g,'')||'Malgun Gothic',fontSize:n.fontSize*k*72,bold:n.fontWeight>=600,color:pptxColor(n.color).color,margin:0,breakLine:false,valign:n.verticalAlign==='bottom'?'bottom':n.verticalAlign==='center'||n.type==='button'?'middle':'top',align:n.textAlign||(n.type==='button'?'center':'left'),transparency:pptxColor(n.color,n.opacity).transparency});
  }
 }return await pptx.write({outputType:'blob'}) as Blob;
}
