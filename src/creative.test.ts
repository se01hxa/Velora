import {describe,it,expect} from 'vitest';
import {backgroundPresets,presetPaint,gradientStops,paintCss,normalizeGradient} from './paint';
import {auroraBanner,decorations,decorationNodes} from './creative';
import {parseProject} from './validation';
import {projectForPage} from './workspace-store';
import {normalizeNode,applyOperations} from './model';
import {exportDesign} from './exporters';
import {fontBytes,validateFonts,fontCss} from './fonts';
import {planGif} from './gif-options';

describe('detailed creative tools',()=>{
  it('has twelve safe editable multi-stop backgrounds and both gradient types',()=>{
    expect(backgroundPresets).toHaveLength(12);
    for(const p of backgroundPresets){const paint=presetPaint(p);expect(gradientStops(paint.gradient!)).toHaveLength(3);expect(paintCss(paint)).toContain(p.type==='radial'?'radial-gradient':'linear-gradient');expect(gradientStops(normalizeGradient(paint.gradient!))[0].position).toBe(0);}
    expect(normalizeGradient({from:'url(https://invalid)',to:'#ffffff',angle:Infinity}).from).toBe('#D7ECF7');
  });
  it('generates eight native editable decorations without shared IDs or missing parents',()=>{
    const ids=new Set<string>();for(const d of decorations){const nodes=decorationNodes(d.id,{width:2048,height:683}),p=auroraBanner();p.nodes=nodes;const restored=parseProject(JSON.stringify(projectForPage(p)));expect(restored.pages[0].nodes.length).toBe(nodes.length);for(const n of nodes){expect(ids.has(n.id)).toBe(false);ids.add(n.id);if(n.parentId)expect(nodes.some(p=>p.id===n.parentId)).toBe(true);}}
  });
  it('round-trips the reference-inspired banner, colors, dotted paths and typography',()=>{
    const p=auroraBanner(),project=projectForPage(p),restored=parseProject(JSON.stringify(project));expect(restored.pages[0]).toMatchObject({width:2048,height:683,kind:'banner'});expect(p.nodes.find(n=>n.text.startsWith('Compile'))?.fontFamily).toBe('Segoe Script');expect(restored.pages[0].nodes.some(n=>n.strokeDash?.length)).toBe(true);expect(restored.pages[0].nodes[0].gradient?.stops).toHaveLength(3);
  });
  it('preserves advanced paints, typography and line settings through MCP-style edits and web/SVG exports',()=>{
    const p=auroraBanner();p.nodes=[normalizeNode('vector',{name:'Curve',vectorPath:'M0 30 C30 0 70 100 100 60',fillType:'radial',gradient:{from:'#fff',to:'#000',angle:45,stops:[{color:'#fff',position:0},{color:'#abc',position:.5},{color:'#000',position:1}]},stroke:'#fff',strokeWidth:2,strokeDash:[1,8],strokeCap:'round',fontStyle:'italic',textDecoration:'underline'})];
    let project=projectForPage(p);project=applyOperations(project,p.id,[{type:'update',ids:[p.nodes[0].id],patch:{strokeDash:[2,11],strokeCap:'round'}}]).project;
    const restored=parseProject(JSON.stringify(project));expect(restored.pages[0].nodes[0]).toMatchObject({fillType:'radial',strokeDash:[2,11],strokeCap:'round',fontStyle:'italic',textDecoration:'underline'});
    const svg=exportDesign(restored,restored.pages[0],'svg')[0].content;expect(svg).toContain('<radialGradient');expect(svg).toContain('offset="0.5"');expect(svg).toContain('stroke-dasharray="2 11"');expect(svg).toContain('stroke-linecap="round"');
    expect(exportDesign(restored,restored.pages[0],'html').find(f=>f.name==='index.html')!.content).toContain('<radialGradient');
  });
});

describe('embedded TTF storage boundaries',()=>{
  const data='data:font/ttf;base64,AAEAAAAAAAAAAAAA',font={id:'VeloraFont_1234567890abcdef',family:'VeloraFont_1234567890abcdef',name:'Example',data};
  it('accepts bounded sfnt data and preserves it in a project without changing legacy documents',()=>{
    expect(fontBytes(data)).toHaveLength(12);const project=projectForPage(auroraBanner());project.fonts=[font];expect(parseProject(JSON.stringify(project)).fonts).toEqual([font]);expect(fontCss([font])).toContain('@font-face');expect(fontCss([font])).toContain('data:font/ttf;base64,');
  });
  it('rejects arbitrary URLs, broken font signatures, CSS identifiers, duplicates and excessive count',()=>{
    for(const data of ['https://example.com/font.ttf','data:text/html;base64,AAEA','data:font/ttf;base64,AAAAAAAAAAAAAAAA'])expect(()=>fontBytes(data)).toThrow();
    expect(()=>validateFonts([{...font,family:'bad;src:url(x)'}])).toThrow();expect(()=>validateFonts([font,font])).toThrow();expect(()=>validateFonts(Array(13).fill(font))).toThrow();
  });
});

describe('bounded GIF export plans',()=>{
  const options={width:640,duration:2,fps:12,repeat:true,matte:'#ffffff'};
  it('keeps aspect ratio, plans distinct time samples and distributes GIF delay rounding',()=>{
    const p=planGif({width:2048,height:683},options);expect(p).toMatchObject({width:640,height:213,frames:24,duration:2});expect(new Set(p.delays).size).toBe(2);
  });
  it('rejects invalid settings and expensive exports before allocating frames',()=>{
    for(const patch of [{width:0},{fps:NaN},{fps:31},{duration:0},{duration:21},{duration:20,fps:30},{width:2048,duration:10,fps:12},{matte:'url(x)'}])expect(()=>planGif({width:1920,height:1080},{...options,...patch})).toThrow();
  });
  it('bounds portrait output without stretching it',()=>{expect(planGif({width:1080,height:1920},{...options,width:2048})).toMatchObject({width:1152,height:2048});});
});
