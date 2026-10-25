import type {DesignPage} from './types';
export interface GifOptions {width:number;duration:number;fps:number;repeat:boolean;matte:string}
export function planGif(page:Pick<DesignPage,'width'|'height'>,options:GifOptions){
  if(!Number.isFinite(options.width)||options.width<1||options.width>2048)throw Error('GIF 너비는 1~2,048px로 설정하세요.');
  if(!Number.isFinite(options.duration)||options.duration<.2||options.duration>20)throw Error('GIF 길이는 0.2~20초로 설정하세요.');
  if(!Number.isInteger(options.fps)||options.fps<5||options.fps>30)throw Error('프레임 수는 초당 5~30으로 설정하세요.');
  if(!/^#[\da-f]{6}$/i.test(options.matte))throw Error('배경색을 확인하세요.');
  const scale=Math.min(options.width/page.width,2048/page.height),width=Math.max(1,Math.round(page.width*scale)),height=Math.max(1,Math.round(page.height*scale)),frames=Math.ceil(options.duration*options.fps);
  if(frames>300)throw Error('한 GIF는 최대 300프레임입니다. 길이나 FPS를 줄이세요.');
  if(width*height*frames>120_000_000)throw Error('현재 설정의 GIF가 너무 큽니다. 출력 너비, 길이 또는 FPS를 줄이세요.');
  // GIF delays use centiseconds; accumulate rounding so total duration stays accurate.
  const delays=Array.from({length:frames},(_,i)=>Math.max(20,(Math.round((i+1)*options.duration*100/frames)-Math.round(i*options.duration*100/frames))*10));
  return{width,height,frames,delays,duration:delays.reduce((a,b)=>a+b,0)/1000};
}
