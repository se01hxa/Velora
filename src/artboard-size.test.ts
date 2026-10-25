import {describe,it,expect} from 'vitest';
import {parseArtboardSize,validArtboardSize} from './artboard-size';
import {createPage} from './templates';
import {projectForPage} from './workspace-store';
import {parseProject} from './validation';
import {applyOperations,normalizeNode} from './model';
import {exportDesign} from './exporters';

describe('custom artboard dimensions',()=>{
  it('accepts custom dimensions, decimals and the full supported range',()=>{
    expect(parseArtboardSize('1536','864')).toEqual({width:1536,height:864});
    expect(parseArtboardSize('320.5','50')).toEqual({width:320.5,height:50});
    expect(validArtboardSize(1,16384)).toBe(true);
  });
  it('rejects unfinished, non-finite and out-of-range input without silently clamping',()=>{
    for(const [w,h]of [['','50'],[' ','50'],['320',''],['0','50'],['-1','50'],['NaN','50'],['Infinity','50'],['16385','50'],['320','0']])expect(parseArtboardSize(w,h)).toBeNull();
  });
  it('creates arbitrary named sizes for every platform',()=>{
    for(const kind of ['desktop','mobile','web','banner','slide'] as const)expect(createPage(kind,{name:'My canvas',width:1536,height:864})).toMatchObject({name:'My canvas',kind,width:1536,height:864,nodes:[]});
    expect(()=>createPage('banner',{width:0,height:50})).toThrow();
  });
  it('preserves a small custom banner through save, reopen and generated code',()=>{
    const p=projectForPage(createPage('banner',{name:'Thin banner',width:320.5,height:50}));
    const restored=parseProject(JSON.stringify(p));expect(restored.pages[0]).toMatchObject({width:320.5,height:50});
    expect(exportDesign(restored,restored.pages[0],'svg')[0].content).toContain('width="320.5" height="50"');
    expect(exportDesign(restored,restored.pages[0],'html').find(f=>f.name.endsWith('.css'))!.content).toMatch(/height:\s*50px/);
  });
  it('resizes small pages using constraints in a single immutable edit',()=>{
    const p=projectForPage(createPage('banner',{width:320,height:100}));
    p.pages[0].nodes=[normalizeNode('frame',{x:290,y:70,width:20,height:20,constraints:{horizontal:'right',vertical:'bottom'}})];
    const r=applyOperations(p,p.activePageId,[{type:'resize_page',width:468,height:60}]).project;
    expect(r.pages[0]).toMatchObject({width:468,height:60});expect(r.pages[0].nodes[0]).toMatchObject({x:438,y:30});expect(p.pages[0]).toMatchObject({width:320,height:100});
    expect(()=>applyOperations(p,p.activePageId,[{type:'resize_page',width:1,height:0}])).toThrow();
  });
});
