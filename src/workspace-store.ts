import type {DesignProject, DesignPage} from './types';
import {parseProject} from './validation';
import {createProject, createPage} from './templates';
import {normalizeNode} from './model';

export const CURRENT_PROJECT = 'luma-studio.project.v2';
export const LAST_PROJECT = 'luma-studio.workspace.active';
export const RECOVERY_PROJECT = 'luma-studio.workspace.recovery';
export interface WorkspaceFile {
  id: string; project: DesignProject; createdAt: number; updatedAt: number;
  openedAt: number; starred: boolean; trashedAt?: number;
}
export function fileForProject(project: DesignProject): WorkspaceFile {
  const now = Date.now();
  return {id: crypto.randomUUID(), project, createdAt: now, updatedAt: now, openedAt: now, starred: false};
}
export function projectForPage(page: DesignPage, name = page.name): DesignProject {
  return {version: 2, name, activePageId: page.id, pages: [page], revision: 0, timeline: {duration: 6, fps: 60}};
}
export function legacyProject(): DesignProject {
  try { const value = localStorage.getItem(CURRENT_PROJECT); if(value) return parseProject(value); } catch { /* Keep the original storage intact. */ }
  return createProject();
}
function glassProject(): DesignProject {
  const p = createPage('web'); p.name = 'Obsidian · Glass interface'; p.width = 1440; p.height = 900; p.background = '#101112';
  p.nodes = [
    normalizeNode('ellipse',{name:'Ambient glow',x:780,y:120,width:560,height:560,fillType:'linear',gradient:{from:'#969696',to:'#171717',angle:150},opacity:.3,blur:75}),
    normalizeNode('text',{name:'Collection label',x:92,y:90,width:800,height:30,text:'VELORA / MATERIAL EXPLORATIONS',fontSize:16,letterSpacing:4,color:'#8f9194'}),
    normalizeNode('text',{name:'Headline',x:92,y:195,width:1000,height:180,text:'Less noise.\nMore possibility.',fontSize:82,fontWeight:500,color:'#efefef',lineHeight:1.05}),
    normalizeNode('text',{name:'Supporting copy',x:96,y:410,width:780,height:70,text:'A quiet surface for your next idea.\n검은 유리, 부드러운 빛, 섬세한 움직임.',fontSize:22,color:'#9c9ea1',lineHeight:1.6}),
    normalizeNode('frame',{id:'obsidian-input',name:'Smoked glass / Search',x:92,y:585,width:1040,height:124,radius:64,fill:'#171819cc',glass:true,blur:32,stroke:'#ffffff45',strokeWidth:1,shadow:true,shadowY:20,shadowBlur:60,shadowColor:'#00000090'}),
    normalizeNode('text',{name:'Add icon',parentId:'obsidian-input',x:40,y:29,width:60,height:65,text:'+',fontSize:52,fontWeight:300,color:'#ededed'}),
    normalizeNode('text',{name:'Placeholder',parentId:'obsidian-input',x:135,y:46,width:500,height:40,text:'Make room for an idea.',fontSize:26,color:'#b4b4b6'}),
    normalizeNode('button',{name:'Continue',parentId:'obsidian-input',x:900,y:24,width:76,height:76,text:'↗',fontSize:35,radius:40,fill:'#252628',color:'#ededed',stroke:'#ffffff45',strokeWidth:1,animation:'pulse',duration:3}),
    normalizeNode('button',{name:'Close',x:1160,y:598,width:100,height:100,text:'×',fontSize:42,fontWeight:300,radius:50,fill:'#191a1ccc',color:'#b0b1b3',glass:true,blur:24,stroke:'#ffffff35',strokeWidth:1}),
    normalizeNode('text',{name:'Footnote',x:96,y:805,width:1150,height:30,text:'OBSIDIAN COLLECTION                                           LIGHT, HELD IN GLASS.                                     01 / 06',fontSize:13,color:'#6c6d70',letterSpacing:2}),
  ];
  return projectForPage(p,'Obsidian · Glass explorations');
}
export function seedFiles(): WorkspaceFile[] {
  const original = fileForProject(legacyProject());
  const samples = createProject().pages.slice(1).map(p=>fileForProject(projectForPage(p)));
  const glass = fileForProject(glassProject()); glass.starred = true;
  return [original, glass, ...samples].map((file,i)=>({...file, updatedAt: Date.now()-i*3_600_000, openedAt: Date.now()-i*3_600_000}));
}
export async function openWorkspace(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request = indexedDB.open('luma-studio-workspace',1);
    request.onupgradeneeded = ()=>request.result.createObjectStore('files',{keyPath:'id'});
    request.onerror = ()=>reject(request.error || new Error('작업 공간을 열 수 없습니다.'));
    request.onblocked = ()=>reject(new Error('다른 Velora 창을 닫고 다시 시도하세요.'));
    request.onsuccess = ()=>resolve(request.result);
  });
}
export async function readFiles(db:IDBDatabase): Promise<WorkspaceFile[]> {
  const raw = await new Promise<WorkspaceFile[]>((resolve,reject)=>{
    const transaction=db.transaction('files','readonly'),request=transaction.objectStore('files').getAll();
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
  });
  return raw.map(file=>({...file,project:parseProject(JSON.stringify(file.project))}));
}
export async function writeFiles(db:IDBDatabase,files:WorkspaceFile[]):Promise<void> {
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction('files','readwrite');
    for(const file of files)transaction.objectStore('files').put(file);
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(transaction.error || new Error('저장 공간이 부족합니다.'));
    transaction.onabort=()=>reject(transaction.error || new Error('프로젝트 저장이 중단됐습니다.'));
  });
}
