import type {DesignProject,DesignPage} from './types';
import {resolvePage} from './model';
import {exportDesign} from './exporters';
import {planGif,type GifOptions} from './gif-options';

export async function createGif(project:DesignProject,page:DesignPage,options:GifOptions,onProgress:(frame:number,total:number)=>void,signal:AbortSignal):Promise<{blob:Blob;width:number;height:number;frames:number;duration:number}>{
  const plan=planGif(page,options),canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
  const worker=new Worker(new URL('./gif.worker.ts',import.meta.url),{type:'module'});let sequence=0;
  const pending=new Map<number,{resolve:(data:any)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  const fail=(error:Error)=>{for(const request of pending.values()){clearTimeout(request.timer);request.reject(error);}pending.clear();};
  const abort=()=>{fail(new DOMException('GIF 만들기를 중지했습니다.','AbortError'));worker.terminate();};
  signal.addEventListener('abort',abort);
  worker.onerror=()=>fail(new Error('GIF 인코더를 시작하지 못했습니다. 앱을 다시 실행해 주세요.'));
  worker.onmessage=event=>{const request=pending.get(event.data.id);if(!request)return;pending.delete(event.data.id);clearTimeout(request.timer);if(event.data.ok)request.resolve(event.data.data);else request.reject(new Error(event.data.error));};
  const send=(message:Record<string,unknown>,transfer:Transferable[]=[])=>new Promise<any>((resolve,reject)=>{if(signal.aborted){reject(new DOMException('중지했습니다.','AbortError'));return;}const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('GIF 처리 시간이 초과됐습니다. 출력 크기를 줄여 주세요.'));},120000);pending.set(id,{resolve,reject,timer});worker.postMessage({...message,id},transfer);});
  try{
    await send({type:'init',width:plan.width,height:plan.height,repeat:options.repeat});
    for(let i=0;i<plan.frames;i++){
      if(signal.aborted)throw new DOMException('중지했습니다.','AbortError');
      const sampled=resolvePage(page,i*options.duration/plan.frames),svg=exportDesign(project,sampled,'svg').find(f=>f.name==='design.svg')!.content,url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),image=new Image();
      try{image.src=url;await image.decode();ctx.fillStyle=options.matte;ctx.fillRect(0,0,plan.width,plan.height);ctx.drawImage(image,0,0,plan.width,plan.height);}finally{URL.revokeObjectURL(url);}
      const pixels=ctx.getImageData(0,0,plan.width,plan.height).data;
      await send({type:'frame',data:pixels.buffer,delay:plan.delays[i]},[pixels.buffer]);onProgress(i+1,plan.frames);
    }
    const buffer=await send({type:'finish'});return{blob:new Blob([buffer],{type:'image/gif'}),...plan};
  }finally{signal.removeEventListener('abort',abort);worker.terminate();fail(new DOMException('작업을 종료했습니다.','AbortError'));}
}
