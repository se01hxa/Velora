import {describe,it,expect} from 'vitest';
import {wpfExport} from './export-wpf';
import {createProject} from './templates';
import {normalizeNode} from './model';
describe('Windows WPF export',()=>{
 it('provides an executable SDK project and escaped native markup',()=>{const p=createProject();p.pages[0].nodes.push(normalizeNode('text',{text:'<unsafe> & "quoted"',name:'<name>',x:20,y:20}));const files=wpfExport(p,p.pages[0]);expect(files.map(f=>f.name)).toContain('LumaDesign.csproj');const screen=files.find(f=>f.name==='Screen.xaml')!.content;expect(screen).toContain('&lt;unsafe&gt; &amp; &quot;quoted&quot;');expect(screen).not.toContain('<unsafe>');expect(screen).toContain('Canvas.Left');expect(files.find(f=>f.name==='Screen.xaml.cs')!.content).toContain('InitializeComponent');});
 it('converts CSS alpha, vector geometry, gradients and preset animations',()=>{const p=createProject();p.pages[0].nodes=[normalizeNode('polygon',{id:'triangle',fill:'#12345680',stroke:'#fff',strokeWidth:2,animation:'pulse'}),normalizeNode('frame',{fillType:'linear',gradient:{from:'#123',to:'#abc',angle:45}})];const screen=wpfExport(p,p.pages[0]).find(f=>f.name==='Screen.xaml')!.content;expect(screen).toContain('#80123456');expect(screen).toContain('Data="M50 0 L100 100 L0 100 Z"');expect(screen).toContain('LinearGradientBrush');expect(screen).toContain('Storyboard');expect(screen).toContain('ScaleTransform.ScaleX');});
});
