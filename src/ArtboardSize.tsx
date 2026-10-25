import {useEffect, useId, useState} from 'react';
import {ArrowLeftRight, Plus, Ruler} from 'lucide-react';
import type {DesignPage, PageKind} from './types';
import {createPage} from './templates';
import {MAX_ARTBOARD_SIZE, MIN_ARTBOARD_SIZE, parseArtboardSize} from './artboard-size';

const kinds: [PageKind, string][] = [['desktop','Windows'],['mobile','Android'],['web','웹'],['banner','배너 · SNS'],['slide','프레젠테이션']];
function SizeFields({width,height,setWidth,setHeight,error,compact=false}:{width:string;height:string;setWidth:(v:string)=>void;setHeight:(v:string)=>void;error:string;compact?:boolean}) {
  const errorId=useId();
  return <div className={`custom-size-fields ${compact?'compact':''}`}>
    <label><span>너비 <small>px</small></span><input aria-label="자유 사이즈 너비" aria-describedby={error?errorId:undefined} aria-invalid={!!error} type="number" min={MIN_ARTBOARD_SIZE} max={MAX_ARTBOARD_SIZE} step="any" value={width} onChange={e=>setWidth(e.target.value)}/></label>
    <button type="button" className="size-swap" aria-label="너비와 높이 바꾸기" title="너비와 높이 바꾸기" onClick={()=>{setWidth(height);setHeight(width);}}><ArrowLeftRight size={15}/></button>
    <label><span>높이 <small>px</small></span><input aria-label="자유 사이즈 높이" aria-describedby={error?errorId:undefined} aria-invalid={!!error} type="number" min={MIN_ARTBOARD_SIZE} max={MAX_ARTBOARD_SIZE} step="any" value={height} onChange={e=>setHeight(e.target.value)}/></label>
    {error&&<p id={errorId} className="size-error" role="alert">{error}</p>}
  </div>;
}
const sizeError='너비와 높이에 1~16,384px 사이의 숫자를 입력하세요.';

export function CustomArtboardForm({onCreate,defaultKind='desktop'}:{onCreate:(page:DesignPage)=>void;defaultKind?:PageKind}) {
  const [kind,setKind]=useState<PageKind>(defaultKind),[name,setName]=useState(''),[width,setWidth]=useState('1440'),[height,setHeight]=useState('900'),[error,setError]=useState('');
  return <form className="custom-artboard-form" noValidate onSubmit={event=>{event.preventDefault();const size=parseArtboardSize(width,height);if(!size){setError(sizeError);return;}setError('');onCreate(createPage(kind,{...size,name:name.trim()||'자유 사이즈'}));}}>
    <div className="custom-size-heading"><span><Ruler size={19}/></span><div><h3>자유 사이즈</h3><p>원하는 크기를 직접 입력해 시작하세요.</p></div><small>1–16,384 px</small></div>
    <div className="custom-size-creation"><label className="custom-name"><span>작업 이름</span><input aria-label="자유 사이즈 작업 이름" maxLength={200} placeholder="나의 새로운 디자인" value={name} onChange={e=>setName(e.target.value)}/></label><label className="custom-kind"><span>작업 종류</span><select aria-label="자유 사이즈 작업 종류" value={kind} onChange={e=>setKind(e.target.value as PageKind)}>{kinds.map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label><SizeFields width={width} height={height} setWidth={v=>{setWidth(v);setError('');}} setHeight={v=>{setHeight(v);setError('');}} error={error}/><button type="submit" className="primary custom-create"><Plus size={15}/>만들기</button></div>
  </form>;
}

export function ArtboardSizeEditor({page,onResize}:{page:DesignPage;onResize:(width:number,height:number)=>void}) {
  const [width,setWidth]=useState(String(page.width)),[height,setHeight]=useState(String(page.height)),[error,setError]=useState('');
  useEffect(()=>{setWidth(String(page.width));setHeight(String(page.height));setError('');},[page.id,page.width,page.height]);
  return <form className="artboard-size-editor" noValidate onSubmit={event=>{event.preventDefault();const size=parseArtboardSize(width,height);if(!size){setError(sizeError);return;}setError('');if(size.width!==page.width||size.height!==page.height)onResize(size.width,size.height);}}>
    <div className="size-editor-label"><span>자유 사이즈</span><small>px</small></div><SizeFields compact width={width} height={height} setWidth={v=>{setWidth(v);setError('');}} setHeight={v=>{setHeight(v);setError('');}} error={error}/><button type="submit" className="secondary size-apply">크기 적용</button><p className="size-help">1–16,384px · 변경 사항은 실행 취소할 수 있어요.</p>
  </form>;
}
