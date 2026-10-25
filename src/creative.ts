import {normalizeNode} from './model';
import type {DesignNode,DesignPage} from './types';
import {backgroundPresets,presetPaint} from './paint';

export const decorations=[
  {id:'wave',name:'부드러운 물결',description:'가느다란 베지어 곡선 3개',icon:'∿'},
  {id:'orbit',name:'점선 궤도',description:'타원 궤도와 떠다니는 점',icon:'◌'},
  {id:'sparkle',name:'별 · 십자',description:'은은하게 깜빡이는 작은 빛',icon:'✧'},
  {id:'glow',name:'소프트 글로우',description:'반투명 블러와 방사형 빛',icon:'◉'},
  {id:'dots',name:'도트 그리드',description:'간격이 일정한 점 패턴',icon:'⠿'},
  {id:'ribbon',name:'컬러 리본',description:'반투명 그라디언트 띠',icon:'≈'},
  {id:'cross',name:'크로스 패턴',description:'라벤더와 민트색 십자 장식',icon:'+'},
  {id:'rings',name:'동심원',description:'겹쳐진 라인 링 3개',icon:'◎'},
];
export function decorationNodes(id:string,page:Pick<DesignPage,'width'|'height'>):DesignNode[]{
  const w=Math.max(24,Math.min(page.width*.7,1400)),h=Math.max(24,Math.min(page.height*.65,600)),root=normalizeNode('group',{name:decorations.find(d=>d.id===id)?.name||'장식',x:(page.width-w)/2,y:(page.height-h)/2,width:w,height:h,fill:'transparent',radius:0}),nodes=[root];
  const add=(type:DesignNode['type'],name:string,x:number,y:number,width:number,height:number,extra:Partial<DesignNode>)=>nodes.push(normalizeNode(type,{name,parentId:root.id,x:x*w,y:y*h,width:width*w,height:height*h,fill:'transparent',radius:0,...extra}));
  if(id==='wave'){['M0 30 C35 0 65 100 100 60','M0 65 C30 20 70 10 100 90','M0 95 C35 70 60 5 100 40'].forEach((vectorPath,i)=>add('vector','물결 '+(i+1),0,0,1,1,{vectorPath,stroke:i===1?'#B4A4D0':'#FFFFFF',strokeWidth:i===0?1.8:1,opacity:.6,strokeCap:'round'}));}
  if(id==='orbit'){add('ellipse','점선 궤도',.08,.1,.84,.78,{stroke:'#A39BC9',strokeWidth:1.5,strokeDash:[2,10],opacity:.65,rotation:-22});add('ellipse','궤도 위의 빛',.75,.2,.018,.035,{fill:'#A899D4',animation:'float',duration:6});}
  if(id==='sparkle'||id==='cross'){const points=id==='sparkle'?[[.2,.3],[.75,.2],[.6,.75]]:[[.2,.3],[.55,.6],[.8,.25],[.35,.8]];points.forEach(([x,y],i)=>{add('vector','십자 빛 '+i,x,y,.035,.07,{vectorPath:'M50 0 L50 100 M0 50 L100 50',stroke:i%2?'#BAA5DB':'#DBF6FC',strokeWidth:1.8,strokeCap:'round',animation:id==='sparkle'?'fade':'none',duration:4+i,opacity:.8});});}
  if(id==='glow'){add('ellipse','블루 글로우',.05,.06,.7,.8,{fill:'#B4EBF6',fillType:'radial',gradient:{from:'#BFEFFF',to:'#BFEFFF00',angle:0},blur:35,opacity:.85,animation:'pulse',duration:6});add('ellipse','라벤더 글로우',.4,.3,.6,.65,{fill:'#BCA9EA',fillType:'radial',gradient:{from:'#C8B8F0',to:'#C8B8F000',angle:0},blur:30,opacity:.75});}
  if(id==='dots')for(let y=0;y<4;y++)for(let x=0;x<8;x++)add('ellipse',`도트 ${x+1}·${y+1}`,.1+x*.11,.18+y*.18,.005,.01,{fill:'#AFA4CC',opacity:.65});
  if(id==='ribbon')for(let i=0;i<2;i++)add('vector','반투명 리본 '+i,0,i*.15,1,.8,{vectorPath:'M0 70 C30 10 65 10 100 40 L100 80 C65 50 30 40 0 100 Z',fill:'#C6B1DF',fillType:'linear',gradient:{from:'#B3E7F0',to:'#C8A6D9',angle:120},opacity:.24});
  if(id==='rings')for(let i=0;i<3;i++)add('ellipse','라인 링 '+i,.2+i*.08,.04+i*.1,.6-i*.16,.9-i*.2,{stroke:i===1?'#ADC5DF':'#F0F4FE',strokeWidth:1.2,opacity:.55});
  return nodes;
}

export function auroraBanner():DesignPage {
  const width=2048,height=683,nodes:DesignNode[]=[],pageId=crypto.randomUUID();
  const add=(type:DesignNode['type'],name:string,x:number,y:number,w:number,h:number,extra:Partial<DesignNode>)=>{const node=normalizeNode(type,{name,x,y,width:w,height:h,fill:'transparent',radius:0,...extra});nodes.push(node);return node.id;};
  add('frame','배경 · 하늘과 라일락',0,0,width,height,{id:'background-'+crypto.randomUUID(),...presetPaint(backgroundPresets[0]),gradient:{from:'#D7F0F7',to:'#C3B3DF',angle:170,stops:[{color:'#D7F0F7',position:0},{color:'#ADD9EA',position:.45},{color:'#C3B3DF',position:1}]},constraints:{horizontal:'stretch',vertical:'stretch'}});
  add('vector','상단의 투명 리본',0,0,2048,300,{vectorPath:'M0 0 H100 V35 C65 115 35 100 0 25 Z',fill:'#F2F6FF',opacity:.15});
  add('vector','하단의 라일락 물결',700,482,1500,201,{vectorPath:'M0 100 C20 0 75 0 100 40 V100 Z',fill:'#BEA8DB',opacity:.22});
  [['물결 곡선 · 01',-60,170,930,500,'M0 10 C42 0 70 30 100 100'],['물결 곡선 · 02',-70,225,940,330,'M0 55 C35 -12 63 -10 100 98'],['물결 곡선 · 03',1340,174,760,483,'M0 100 C50 40 50 2 100 0']].forEach(([name,x,y,w,h,vectorPath])=>add('vector',String(name),Number(x),Number(y),Number(w),Number(h),{vectorPath:String(vectorPath),stroke:'#F0FCFF',strokeWidth:1.2,opacity:.65,strokeCap:'round'}));
  add('vector','크고 은은한 궤적',12,92,900,290,{vectorPath:'M0 80 C40 0 60 -10 100 22',stroke:'#82AEC4',strokeWidth:1.2,opacity:.25});
  add('vector','보라색 점선 궤적',1355,85,700,540,{vectorPath:'M0 100 C0 20 40 4 100 0',stroke:'#AF9BCF',strokeWidth:1.6,strokeDash:[2,11],strokeCap:'round',opacity:.6});
  [[420,224,'#B8A6D5'],[1982,80,'#EBF9FF'],[1935,302,'#B9A5D4']].forEach(([x,y,color],i)=>add('vector','작은 십자 '+i,Number(x),Number(y),24,24,{vectorPath:'M50 0 L50 100 M0 50 L100 50',stroke:String(color),strokeWidth:1,opacity:.85,animation:'fade',duration:4+i}));
  add('ellipse','떠다니는 라일락 점',1512,129,6,6,{fill:'#B29CD8',animation:'float',duration:6});
  add('text','메인 캘리그래피',250,245,1548,153,{text:'Compile the new direction.',fontFamily:'Segoe Script',fontStyle:'italic',fontWeight:400,fontSize:96,color:'#567AA5',textAlign:'center',verticalAlign:'center',lineHeight:1.35,letterSpacing:-2});
  add('button','반투명 서브타이틀',877,418,294,46,{fill:'#BCAFE0',opacity:.55,glass:true,blur:12,radius:23,text:'약속할게 찬란한 미소를',fontSize:18,color:'#5F7D9B',fontWeight:400});
  add('frame','중앙의 작은 대시',1013,496,21,5,{fill:'#7590AF',radius:3,opacity:.7});
  for(let i=0;i<4;i++)add('line','민트 슬래시 '+i,132+i*11,554,26,2,{stroke:'#97DDE4',strokeWidth:2,rotation:-70,opacity:.7});
  add('ellipse','작은 행성 링',1899,551,54,20,{stroke:'#B4B7E0',strokeWidth:1,rotation:-24,opacity:.6});add('ellipse','작은 행성',1909,553,10,10,{fill:'#9EDCE1',animation:'pulse',duration:4});
  return{id:pageId,name:'Aurora · Soft Discord banner',kind:'banner',width,height,background:'#BFD9EB',nodes};
}
