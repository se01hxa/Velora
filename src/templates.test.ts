import {describe,it,expect} from 'vitest';
import {createPage,createProject,makeNode,templates,presets} from './templates';
import {flattenPage,resolvePage} from './model';
import type {PageKind} from './types';

describe('editable starter content and presets',()=>{
  it('creates blank pages for all five artifact kinds',()=>{
    for(const kind of ['desktop','mobile','web','banner','slide'] as PageKind[]){const p=createPage(kind);expect(p.kind).toBe(kind);expect(p.nodes).toHaveLength(0);expect(p.width).toBeGreaterThan(300);expect(p.height).toBeGreaterThan(300);}
  });
  it('provides every requested platform and campaign size',()=>{
    for(const pair of [[1440,900],[412,915],[800,1280],[1920,640],[1200,628],[1080,1080],[1080,1920],[1920,1080],[1280,720]])expect(presets.some(p=>p.width===pair[0]&&p.height===pair[1])).toBe(true);
    expect(new Set(presets.map(p=>p.id)).size).toBe(presets.length);
  });
  it('starts in a rich desktop project with working hierarchy and overlay target',()=>{
    const p=createProject();expect(p.version).toBe(2);expect(p.pages[0].kind).toBe('desktop');expect(p.activePageId).toBe(p.pages[0].id);
    expect(new Set(p.pages.map(page=>page.kind)).size).toBe(5);
    expect(p.pages[0].nodes.length).toBeGreaterThan(80);
    expect(p.pages[0].nodes.filter(n=>n.parentId).length).toBeGreaterThan(50);
    expect(p.pages[0].nodes.filter(n=>n.layout?.direction!=='none').length).toBeGreaterThan(2);
    const trigger=p.pages[0].nodes.find(n=>n.interaction);
    expect(p.pages.some(page=>page.id===trigger?.interaction?.targetPageId)).toBe(true);
    expect(()=>resolvePage(p.pages[0])).not.toThrow();expect(()=>flattenPage(p.pages[0])).not.toThrow();
  });
  it('generates fresh valid editable nodes without shared IDs for every template',()=>{
    expect(templates.length).toBeGreaterThanOrEqual(6);const all=new Set<string>();
    for(const template of templates){const p=template.create();expect(p.kind).toBe(template.kind);expect(p.nodes.length).toBeGreaterThan(5);const resolved=flattenPage(p);expect(resolved.nodes.length).toBe(p.nodes.length);for(const n of p.nodes){expect(all.has(n.id)).toBe(false);all.add(n.id);expect(Number.isFinite(n.width)&&n.width>0).toBe(true);if(n.parentId)expect(p.nodes.some(parent=>parent.id===n.parentId)).toBe(true);}}
    for(const type of ['group','line','polygon','vector'] as const)expect(makeNode(type).type).toBe(type);
  });
});
