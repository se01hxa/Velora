import type {DesignNode,PaintGradient,GradientStop} from './types';
const validColor=(v:unknown):v is string=>typeof v==='string'&&/^(#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|transparent)$/i.test(v);
export function gradientStops(g:PaintGradient):GradientStop[]{
  return g.stops&&g.stops.length>=2?g.stops.filter(s=>validColor(s.color)&&Number.isFinite(s.position)).map(s=>({color:s.color,position:Math.max(0,Math.min(1,s.position))})).sort((a,b)=>a.position-b.position):[{color:g.from,position:0},{color:g.to,position:1}];
}
export function normalizeGradient(g:PaintGradient):PaintGradient {
  const from=validColor(g.from)?g.from:'#D7ECF7',to=validColor(g.to)?g.to:'#C2B5DD';
  return {from,to,angle:Number.isFinite(g.angle)?Math.max(-360,Math.min(360,g.angle)):135,...(g.stops?{stops:gradientStops({...g,from,to}).slice(0,8)}:{})};
}
export function paintCss(n:Pick<DesignNode,'fillType'|'gradient'|'fill'>):string {
  if(n.fillType==='solid'||!n.gradient)return n.fill;
  const g=normalizeGradient(n.gradient),stops=gradientStops(g).map(s=>`${s.color} ${Math.round(s.position*10000)/100}%`).join(',');
  return n.fillType==='radial'?`radial-gradient(ellipse at center,${stops})`:`linear-gradient(${g.angle}deg,${stops})`;
}
export const backgroundPresets=[
  {name:'하늘 · 라일락',type:'linear',colors:['#D7F1F8','#A5D8E9','#C8B2DF'],angle:145},
  {name:'새벽빛',type:'linear',colors:['#EEF0FF','#D6D1EE','#B0BDDC'],angle:120},
  {name:'피치 클라우드',type:'linear',colors:['#F6E5D7','#E8BECE','#C5B9D9'],angle:135},
  {name:'민트 브리즈',type:'linear',colors:['#E9F4E4','#BDDDD5','#AAC6D9'],angle:145},
  {name:'선셋 오렌지',type:'linear',colors:['#FFE4B6','#ECA69F','#9B8DC3'],angle:120},
  {name:'딥 오션',type:'linear',colors:['#102A40','#254C66','#396979'],angle:135},
  {name:'오로라 나이트',type:'linear',colors:['#1B183A','#46446C','#61828C'],angle:135},
  {name:'실버 글래스',type:'linear',colors:['#E3E5E8','#999FA8','#D6D9DF'],angle:130},
  {name:'라벤더 글로우',type:'radial',colors:['#F2E9FF','#BDADD7','#7D759C'],angle:0},
  {name:'블루 헤일로',type:'radial',colors:['#E1F6FC','#A2C5DD','#52748B'],angle:0},
  {name:'크림 스포트라이트',type:'radial',colors:['#FFF8DF','#E5D4B6','#ADA690'],angle:0},
  {name:'블랙 스포트라이트',type:'radial',colors:['#57555E','#2A2931','#111116'],angle:0},
] as const;
export function presetPaint(p:typeof backgroundPresets[number]):Pick<DesignNode,'fill'|'fillType'|'gradient'> {
  return {fill:p.colors[0],fillType:p.type,gradient:{from:p.colors[0],to:p.colors[2],angle:p.angle,stops:p.colors.map((color,i)=>({color,position:i/2}))}};
}
