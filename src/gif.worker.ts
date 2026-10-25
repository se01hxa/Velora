import {GIFEncoder,quantize,applyPalette} from 'gifenc';
let encoder:ReturnType<typeof GIFEncoder>,palette:number[][]|undefined,width=0,height=0,repeat=0,frame=0;
self.onmessage=(event:MessageEvent)=>{
  const message=event.data;
  try{
    if(message.type==='init'){width=message.width;height=message.height;repeat=message.repeat?0:-1;encoder=GIFEncoder();palette=undefined;frame=0;self.postMessage({id:message.id,ok:true});}
    else if(message.type==='frame'){
      const rgba=new Uint8Array(message.data);if(rgba.length!==width*height*4)throw Error('GIF 프레임 크기가 올바르지 않습니다.');
      if(!palette)palette=quantize(rgba,256);
      // A small ordered dither softens palette bands on pastel gradients.
      const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){const offset=(y*width+x)*4,amount=(bayer[(y%4)*4+x%4]/16-.46875)*8;for(let c=0;c<3;c++)rgba[offset+c]=Math.max(0,Math.min(255,Math.round(rgba[offset+c]+amount)));}
      encoder.writeFrame(applyPalette(rgba,palette),width,height,{...(frame===0?{palette}:{}),delay:message.delay,repeat,dispose:1});frame++;
      if(encoder.bytesView().length>64_000_000)throw Error('GIF 결과가 64MB를 초과합니다. 출력 크기를 줄이세요.');
      self.postMessage({id:message.id,ok:true});
    }else if(message.type==='finish'){encoder.finish();const bytes=encoder.bytes();self.postMessage({id:message.id,ok:true,data:bytes.buffer}, {transfer:[bytes.buffer]});}
  }catch(error){self.postMessage({id:message.id,ok:false,error:error instanceof Error?error.message:String(error)});}
};
