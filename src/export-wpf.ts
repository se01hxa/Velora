import type {DesignProject,DesignPage,DesignNode,ExportFile} from './types';
import {flattenPage} from './model';
import {gradientStops} from './paint';
const xml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/\r?\n/g,'&#10;').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const num=(n:number)=>String(Math.round(n*1000)/1000);
function color(value:string){if(value==='transparent')return'Transparent';let h=value.replace('#','');if(h.length<=4)h=[...h].map(c=>c+c).join('');return`#${h.length===8?h.slice(6)+h.slice(0,6):h}`;}
export function wpfExport(project:DesignProject,source:DesignPage):ExportFile[]{
 const page=flattenPage(source),resources:string[]=[],animations:string[]=[];
 const elements=page.nodes.filter(n=>n.visible).map((n,i)=>{
  const name=`Layer_${i+1}`,brush=`Fill_${i+1}`;
  if(n.fillType!=='solid'&&n.gradient){const a=n.gradient.angle*Math.PI/180,dx=Math.sin(a),dy=-Math.cos(a),stops=gradientStops(n.gradient).map(s=>`<GradientStop Color="${color(s.color)}" Offset="${num(s.position)}"/>`).join('');resources.push(n.fillType==='radial'?`<RadialGradientBrush x:Key="${brush}" Center="0.5,0.5" GradientOrigin="0.5,0.5" RadiusX="0.7071" RadiusY="0.7071">${stops}</RadialGradientBrush>`:`<LinearGradientBrush x:Key="${brush}" StartPoint="${num(.5-dx/2)},${num(.5-dy/2)}" EndPoint="${num(.5+dx/2)},${num(.5+dy/2)}">${stops}</LinearGradientBrush>`);}
  const fill=n.fillType!=='solid'&&n.gradient?`{StaticResource ${brush}}`:color(n.fill),stroke=color(n.stroke||'transparent');
  const attrs=`x:Name="${name}" Canvas.Left="${num(n.x)}" Canvas.Top="${num(n.y)}" Width="${num(n.width)}" Height="${num(n.height)}" Opacity="${num(n.opacity)}" RenderTransformOrigin="0.5,0.5" ToolTip="${xml(n.name)}"`;
  const transform=(tag:string)=>`<${tag}.RenderTransform><TransformGroup><RotateTransform Angle="${num(n.rotation)}"/><TranslateTransform/><ScaleTransform/></TransformGroup></${tag}.RenderTransform>`;
  const effect=(tag:string)=>n.shadow?`<${tag}.Effect><DropShadowEffect Color="${color(n.shadowColor||'#00000040')}" BlurRadius="${num(n.shadowBlur??28)}" ShadowDepth="${num(Math.hypot(n.shadowX||0,n.shadowY??12))}" Opacity="0.3"/></${tag}.Effect>`:!n.glass&&n.blur?`<${tag}.Effect><BlurEffect Radius="${num(n.blur)}"/></${tag}.Effect>`:'';
  const text=`<TextBlock Text="${xml(n.text|| (n.type==='image'?'[Image]':''))}" Foreground="${color(n.color)}" FontFamily="${xml(n.fontFamily||'Segoe UI')}" FontSize="${num(n.fontSize)}" FontWeight="${n.fontWeight>=700?'Bold':n.fontWeight>=600?'SemiBold':n.fontWeight>=500?'Medium':'Normal'}" TextWrapping="Wrap" TextAlignment="${n.textAlign==='right'?'Right':n.textAlign==='center'||n.type==='button'?'Center':'Left'}" VerticalAlignment="${n.verticalAlign==='bottom'?'Bottom':n.verticalAlign==='center'||n.type==='button'?'Center':'Top'}" LineHeight="${num(n.fontSize*(n.lineHeight||1.2))}" LineStackingStrategy="BlockLineHeight"/>`;
  if(n.animation!=='none'){
   const basic=`Storyboard.TargetName="${name}" Duration="0:0:${num(n.duration/2)}" BeginTime="0:0:${num(n.delay||0)}" AutoReverse="True" RepeatBehavior="Forever"`;
   const prop=(v:string)=>`(UIElement.RenderTransform).(TransformGroup.Children)[${v}]`;
   if(n.animation==='fade')animations.push(`<DoubleAnimation ${basic} Storyboard.TargetProperty="Opacity" From="${num(n.opacity)}" To="${num(n.opacity*.35)}"/>`);
   else if(n.animation==='pulse'){for(const axis of['X','Y'])animations.push(`<DoubleAnimation ${basic} Storyboard.TargetProperty="${prop('2')}.(ScaleTransform.Scale${axis})" From="1" To="1.045"/>`);}
   else animations.push(`<DoubleAnimation ${basic} Storyboard.TargetProperty="${prop('1')}.(TranslateTransform.${n.animation==='float'?'Y':'X'})" From="0" To="${n.animation==='float'?-10:16}"/>`);
  }
  if(['vector','polygon','line'].includes(n.type)){const data=n.type==='line'?'M0 50 L100 50':n.type==='polygon'?'M50 0 L100 100 L0 100 Z':n.vectorPath||'M0 0 L100 100';return `<Path ${attrs} Data="${xml(data)}" Stretch="Fill" Fill="${n.type==='line'?'Transparent':fill}" Stroke="${stroke}" StrokeThickness="${num(n.strokeWidth|| (n.type==='line'?2:0))}">${transform('Path')}${effect('Path')}</Path>`;}
  if(n.type==='ellipse')return`<Ellipse ${attrs} Fill="${fill}" Stroke="${stroke}" StrokeThickness="${num(n.strokeWidth||0)}">${transform('Ellipse')}${effect('Ellipse')}</Ellipse>`;
  const corner=n.cornerRadii?.map(num).join(',')||num(n.radius);
  return`<Border ${attrs} Background="${fill}" CornerRadius="${corner}" BorderBrush="${stroke}" BorderThickness="${num(n.strokeWidth||0)}">${transform('Border')}${effect('Border')}${n.text||n.type==='image'?text:''}</Border>`;
 }).join('\n    ');
 if(animations.length)resources.push(`<Storyboard x:Key="LumaMotion">${animations.join('\n')}</Storyboard>`);
 const files:ExportFile[]=[
  {name:'LumaDesign.csproj',content:'<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>WinExe</OutputType><TargetFramework>net10.0-windows</TargetFramework><UseWPF>true</UseWPF><Nullable>enable</Nullable><ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>\n'},
  {name:'App.xaml',content:'<Application x:Class="LumaDesign.App" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" StartupUri="MainWindow.xaml"><Application.Resources/></Application>\n'},
  {name:'App.xaml.cs',content:'namespace LumaDesign; public partial class App : System.Windows.Application { }\n'},
  {name:'MainWindow.xaml',content:`<Window x:Class="LumaDesign.MainWindow" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" xmlns:local="clr-namespace:LumaDesign" Title="${xml(source.name)}" Width="${Math.min(1500,page.width+40)}" Height="${Math.min(1000,page.height+60)}" WindowStartupLocation="CenterScreen"><ScrollViewer HorizontalScrollBarVisibility="Auto" VerticalScrollBarVisibility="Auto"><local:Screen/></ScrollViewer></Window>\n`},
  {name:'MainWindow.xaml.cs',content:'namespace LumaDesign; public partial class MainWindow : System.Windows.Window { public MainWindow(){ InitializeComponent(); } }\n'},
  {name:'Screen.xaml',content:`<UserControl x:Class="LumaDesign.Screen" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Width="${num(page.width)}" Height="${num(page.height)}"><UserControl.Resources>${resources.join('\n')}</UserControl.Resources>${animations.length?'<UserControl.Triggers><EventTrigger RoutedEvent="Loaded"><BeginStoryboard Storyboard="{StaticResource LumaMotion}"/></EventTrigger></UserControl.Triggers>':''}<Canvas Width="${num(page.width)}" Height="${num(page.height)}" Background="${color(page.background)}" ClipToBounds="True">\n    ${elements}\n</Canvas></UserControl>\n`},
  {name:'Screen.xaml.cs',content:'namespace LumaDesign; public partial class Screen : System.Windows.Controls.UserControl { public Screen(){ InitializeComponent(); } }\n'},
  {name:'README.txt',content:`Velora / Windows WPF\n${project.name} / ${source.name}\n\n.NET 10 SDK가 설치된 Windows에서 dotnet run으로 실행하세요. Screen.xaml을 기존 WPF 프로젝트에 넣을 때 x:Class와 namespace를 프로젝트에 맞추세요.\n\n계층과 오토레이아웃을 계산한 Canvas 고정 좌표입니다. 그라디언트·테두리·벡터·텍스트·일반 모션 프리셋을 포함합니다. 사용자 키프레임과 부모 연쇄 모션, 부모 클리핑·블렌드·글래스는 완전히 같지 않습니다. 이미지 레이어는 자리 표시자이므로 실제 리소스를 연결하세요. 버튼의 비즈니스 로직과 화면 이동은 연결해야 합니다.\n`},
 ];return files;
}
