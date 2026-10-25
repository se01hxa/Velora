import type { CSSProperties,PointerEvent,MouseEvent } from 'react';
import type { DesignNode,DesignPage } from './types';
import { getChildren } from './model';

export function nodeStyle(n:DesignNode):CSSProperties {
 const isVector=['line','polygon','vector'].includes(n.type);
 const radii=n.cornerRadii?.map(r=>`${r}px`).join(' ');
 return {
  position:'absolute',left:n.x,top:n.y,width:n.width,height:n.height,
  transform:`rotate(${n.rotation}deg) scale(${n.scale??1})`,transformOrigin:'center',
  borderRadius:n.type==='ellipse'?'50%':radii||n.radius,
  background:isVector?'none':n.fillType==='linear'&&n.gradient?`linear-gradient(${n.gradient.angle}deg,${n.gradient.from},${n.gradient.to})`:n.fill,
  border:!isVector&&n.strokeWidth?`${n.strokeWidth}px solid ${n.stroke||'#000000'}`:n.glass?'1px solid #ffffff55':undefined,
  color:n.color,opacity:n.opacity,fontFamily:n.fontFamily||'Segoe UI, Malgun Gothic, sans-serif',
  fontSize:n.fontSize,fontWeight:n.fontWeight,lineHeight:n.lineHeight??1.2,letterSpacing:n.letterSpacing??0,
  textAlign:n.textAlign||(n.type==='button'?'center':'left'),
  justifyContent:n.verticalAlign==='bottom'?'flex-end':n.verticalAlign==='center'||n.type==='button'?'center':'flex-start',
  boxShadow:n.shadow?`${n.shadowX??0}px ${n.shadowY??12}px ${n.shadowBlur??28}px ${n.shadowColor||'#00000024'}`:undefined,
  backdropFilter:n.glass?`blur(${n.blur||16}px) saturate(160%)`:undefined,
  filter:!n.glass&&n.blur?`blur(${n.blur}px)`:undefined,
  mixBlendMode:n.blendMode||'normal',
  overflow:n.clipContent||['text','button','image'].includes(n.type)?'hidden':'visible',
 };
}
interface ViewProps {
 page:DesignPage;parentId?:string;selectedIds?:string[];editingId?:string|null;
 interactive?:boolean;onPointer?:(e:PointerEvent<HTMLDivElement>,n:DesignNode)=>void;
 onDouble?:(e:MouseEvent<HTMLDivElement>,n:DesignNode)=>void;
 onText?:(id:string,text:string)=>void;onInteract?:(n:DesignNode)=>void;
}
export function NodeTree(props:ViewProps){
 const {page,parentId,selectedIds=[],editingId,onPointer,onDouble,onText,onInteract,interactive}=props;
 return <>{getChildren(page,parentId).filter(n=>n.visible).map(n=>{
  const vector=['line','polygon','vector'].includes(n.type);
  const clickable=interactive&&!!n.interaction;
  return <div key={n.id} data-node-id={n.id} data-node-type={n.type}
   className={`design-node type-${n.type} ${selectedIds.includes(n.id)?'is-selected':''} ${clickable?'prototype-link':''}`}
   style={nodeStyle(n)}
   onPointerDown={onPointer?e=>onPointer(e,n):undefined}
   onDoubleClick={onDouble?e=>onDouble(e,n):undefined}
   onClick={clickable&&n.interaction?.trigger==='click'?e=>{e.stopPropagation();onInteract?.(n);}:undefined}
   onMouseEnter={clickable&&n.interaction?.trigger==='hover'?()=>onInteract?.(n):undefined}
   role={clickable?'button':undefined} tabIndex={clickable?0:undefined}
   onKeyDown={clickable?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onInteract?.(n);}}:undefined}>
   {n.type==='image'&&n.image&&<img className="node-image" src={n.image} alt={n.name} draggable={false}/>}
   {vector&&<svg className="node-vector" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={`gradient-${n.id.replace(/[^\w-]/g,'')}`} x2="1" y2="1"><stop stopColor={n.gradient?.from||n.fill}/><stop offset="1" stopColor={n.gradient?.to||n.fill}/></linearGradient></defs>
    <path d={n.type==='line'?'M0 50 L100 50':n.type==='polygon'?'M50 0 L100 100 L0 100 Z':n.vectorPath||'M0 75 C25 0 75 100 100 25'} fill={n.type==='line'?'none':n.fillType==='linear'?`url(#gradient-${n.id.replace(/[^\w-]/g,'')})`:n.fill} stroke={n.stroke||n.color} strokeWidth={n.strokeWidth|| (n.type==='line'?2:0)} vectorEffect="non-scaling-stroke"/>
   </svg>}
   {editingId===n.id?<textarea className="inline-text-editor" aria-label="캔버스 텍스트 편집" autoFocus defaultValue={n.text} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'||e.key==='Enter'&&(e.ctrlKey||e.metaKey))e.currentTarget.blur();}} onBlur={e=>onText?.(n.id,e.target.value)}/>:n.text&&<div className="node-text">{n.text}</div>}
   <NodeTree {...props} parentId={n.id}/>
  </div>;
 })}</>;
}
