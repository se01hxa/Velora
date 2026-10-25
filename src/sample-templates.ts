import {normalizeNode} from './model';
import type {DesignNode,DesignPage,NodeType,PageKind} from './types';

// Each sample is composed of editable native layers, including its illustration.
function canvas(name:string,kind:PageKind,width:number,height:number,background:string) {
  const nodes:DesignNode[]=[];
  const add=(type:NodeType,name:string,x:number,y:number,width:number,height:number,fill:string,extra:Partial<DesignNode>={})=>{const n=normalizeNode(type,{name,x,y,width,height,fill,radius:20,...extra});nodes.push(n);return n.id;};
  const rect=(name:string,x:number,y:number,w:number,h:number,fill:string,extra:Partial<DesignNode>={})=>add('frame',name,x,y,w,h,fill,extra);
  const text=(name:string,value:string,x:number,y:number,w:number,h:number,size=16,color='#F5F4F1',weight=500,extra:Partial<DesignNode>={})=>add('text',name,x,y,w,h,'transparent',{text:value,fontSize:size,color,fontWeight:weight,radius:0,lineHeight:1.25,...extra});
  const button=(name:string,value:string,x:number,y:number,w:number,h:number,fill='#D7F0B6',color='#20291A',extra:Partial<DesignNode>={})=>add('button',name,x,y,w,h,fill,{text:value,fontSize:14,color,fontWeight:650,radius:16,...extra});
  const orb=(name:string,x:number,y:number,size:number,fill:string,extra:Partial<DesignNode>={})=>add('ellipse',name,x,y,size,size,fill,extra);
  const done=():DesignPage=>({id:crypto.randomUUID(),name,kind,width,height,background,nodes});
  return {add,rect,text,button,orb,done};
}

function flowboard():DesignPage {
  const c=canvas('Flow · Team planner','desktop',1440,900,'#F1F2EE');
  c.rect('Navigation',20,20,220,860,'#1E2926');c.text('Brand','flow /',45,48,170,44,32,'#DFF1D0',700);
  ['Workspace','Overview','Projects','Calendar','Messages'].forEach((v,i)=>{if(i===2)c.rect('Active navigation',35,225,190,45,'#34473E');c.text('Navigation '+v,v,53,126+i*54,150,24,15,i===2?'#DFF1D0':'#99A99D');});
  c.rect('Team card',35,722,190,140,'#2A3931');c.text('Team heading','A little more together.',52,744,160,50,17,'#E4EBD9',600);c.button('Invite','Invite your team  +',50,809,160,35,'#D7F0B6');
  c.text('Breadcrumb','WORKSPACE  /  PRODUCT',280,44,690,23,12,'#8C9489',650,{letterSpacing:2});c.text('Title','Make room for progress.',280,98,840,57,36,'#27372D',650);c.text('Subtitle','A shared view of the work that matters.',281,166,800,27,16,'#859182');c.button('New task','+  New task',1230,110,168,46);
  ['Board view','Timeline','Team'].forEach((v,i)=>c.button('View '+v,v,280+i*140,228,126,36,i===0?'#2C4135':'#E4E8DF',i===0?'#F1F6EC':'#7A8977'));
  const columns=[['To do','03','#E2E8DC'],['In progress','02','#E9E3D5'],['Done','02','#DBE5DF']];
  const tasks=[['Brand foundations','DESIGN SYSTEM','Mia · Today'],['Explore onboarding','EXPERIENCE','Alex · Tomorrow'],['Review empty states','PRODUCT','Lena · Oct 28'],['Build the library','COMPONENTS','Mia · Oct 29'],['Prototype gestures','MOTION','Owen · Oct 30'],['Kickoff workshop','RESEARCH','Team · Complete'],['Audit typography','FOUNDATIONS','Lena · Complete']];
  columns.forEach(([name,count,fill],i)=>{const x=280+i*377;c.rect('Column '+name,x,299,357,549,fill);c.text('Column title '+i,name,x+18,319,254,25,17,'#425342',650);c.text('Column count '+i,count,x+302,322,35,22,13,'#8E9C85');const subset=i===0?tasks.slice(0,3):i===1?tasks.slice(3,5):tasks.slice(5);subset.forEach(([title,tag,owner],j)=>{const y=372+j*147,id=c.rect('Task '+title,x+14,y,329,132,'#FEFFFA',{shadow:true,shadowBlur:12,shadowY:4,shadowColor:'#172A1910'});c.text('Tag '+title,tag,17,15,296,19,9,'#819276',600,{parentId:id,letterSpacing:1});c.text('Task title '+title,title,17,43,296,28,17,'#354A38',600,{parentId:id});c.orb('Assignee '+title,17,91,22,'#DDE8D0',{parentId:id});c.text('Owner '+title,owner,49,94,250,20,11,'#9BA591',500,{parentId:id});});});
  return c.done();
}

function desktopSound():DesignPage {
  const c=canvas('Echo · Desktop music','desktop',1440,900,'#121320');
  c.rect('Sidebar',20,20,210,860,'#1C1D2C');c.text('Brand','echo',49,49,160,48,35,'#C6BDF9',650);['Discover','Your library','Recently played','Made for you'].forEach((v,i)=>c.text('Nav '+v,v,49,159+i*55,160,25,14,i===0?'#E2DAFF':'#85849C'));
  c.text('Eyebrow','A SOUNDTRACK FOR THE MOMENT',272,55,1000,25,11,'#A19ABD',600,{letterSpacing:2});c.text('Heading','Find your frequency.',270,102,1040,58,41,'#F4EFFF',600);
  c.rect('Featured album',270,203,1120,308,'#302B4B',{fillType:'linear',gradient:{from:'#493963',to:'#252A47',angle:125},radius:32});
  [212,166,120,74].forEach((size,i)=>c.orb('Album orbit '+i,1070+(212-size)/2,248+(212-size)/2,size,['#736193','#9B85B6','#C7B1DB','#F1E1F7'][i],{animation:'float',duration:6}));
  c.text('Featured label','EDITOR’S PICK / 024',302,237,700,22,11,'#B6A6CC',600,{letterSpacing:2});c.text('Featured title','After the noise.',300,288,700,67,50,'#F3E5FA',600);c.text('Featured detail','Slow textures. Warm keys. Space to think.',303,375,700,30,17,'#C0B0D1');c.button('Play mix','▶  Play the mix',304,436,199,44,'#CCBAF1','#2A203B');
  c.text('Playlists heading','Stay a little longer.',270,554,900,35,25,'#ECE7F6',600);
  [['Soft focus','#C9B1D8'],['Late afternoon','#9FAEC7'],['Quiet motion','#AAAD8D'],['Sunday slow','#C3A498']].forEach(([v,fill],i)=>{const x=270+i*284;c.rect('Playlist '+v,x,608,263,165,'#222333');c.orb('Cover '+v,x+14,622,107,fill);c.orb('Vinyl '+v,x+43,651,49,'#313044');c.text('Playlist name '+v,v,x+137,645,110,47,17,'#E2DCEB',600);c.text('Playlist tracks '+v,'24 tracks',x+137,716,105,22,11,'#7E7D95');});
  c.rect('Player',270,803,1120,61,'#24243A');c.text('Now playing','01  /  Weightless',294,823,330,26,14,'#CAC3DD');c.rect('Progress track',660,833,465,4,'#46415C',{radius:2});c.rect('Progress fill',660,833,198,4,'#CDB6F2',{radius:2});c.text('Playback','Ⅱ     ↗',1200,819,150,31,21,'#DED1F1');
  return c.done();
}

function travelApp():DesignPage {
  const c=canvas('Atlas · Travel booking','mobile',412,915,'#F6F2EB');
  c.text('Status','9:41                          ●  ▰',27,20,362,25,13,'#314840',650);c.text('Greeting','YOUR NEXT CHAPTER',26,77,350,22,10,'#919C89',600,{letterSpacing:2});c.text('Title','Somewhere\nworth finding.',24,113,365,102,37,'#28463C',650);
  c.rect('Search',24,241,364,53,'#FFFFFF',{radius:18});c.text('Search placeholder','⌕   Where do you want to go?',40,258,330,24,13,'#A1A895');
  const scene=c.rect('Destination illustration',24,318,364,303,'#C4DBD8',{radius:28,clipContent:true});c.orb('Sun',263,20,65,'#F6D8A4',{parentId:scene});c.add('polygon','Far mountain',68,74,310,196,'#8CADA3',{parentId:scene,radius:0});c.add('polygon','Near mountain',-16,111,296,184,'#648E7C',{parentId:scene,radius:0});c.rect('Lake',0,221,364,82,'#9DC3BE',{parentId:scene,radius:0});c.rect('Caption glass',15,202,334,84,'#F6F9EB',{parentId:scene,glass:true,blur:20,opacity:.9,radius:19});c.text('Location','The quiet side of Kyoto',30,219,300,25,18,'#294C3D',650,{parentId:scene});c.text('Location detail','JAPAN  ·  4 nights  ·  from $420',30,256,300,19,10,'#839B89',500,{parentId:scene});
  c.text('Explore heading','Go at your own pace.',24,650,350,31,21,'#314C3A',650);
  [['Coastal escape','4 journeys','#D8E1D1'],['Into the forest','6 journeys','#E8DDC4']].forEach(([v,meta,fill],i)=>{const x=24+i*187;c.rect('Trip '+v,x,705,177,102,fill);c.text('Trip title '+v,v,x+14,725,151,25,14,'#4F6950',650);c.text('Trip count '+v,meta,x+14,773,151,19,10,'#8D9C80');});
  c.rect('Bottom bar',24,835,364,57,'#FFFFFF');c.button('Explore tab','⌂  Explore',34,845,136,37,'#DCE8D6','#496F4A');c.text('Trips tab','♡ Trips     ◯ Profile',193,855,180,21,11,'#A1AC96');return c.done();
}

function shopApp():DesignPage {
  const c=canvas('Bloom · Lifestyle shop','mobile',412,915,'#FBF5EE');c.text('Status','9:41                          ●  ▰',27,20,362,25,13,'#5E4F47',650);c.text('Brand','bloom.',25,75,260,47,34,'#795C48',650);c.button('Cart','Bag  02',307,80,81,37,'#EBDFD1','#8A705A');
  c.text('Heading','Everyday,\na little softer.',24,145,364,105,37,'#594C43',600);c.text('Intro','Objects for a slower kind of living.',25,270,360,26,14,'#AB9583');
  const hero=c.rect('Product hero',24,323,364,306,'#E4CCB3',{radius:28});c.orb('Product shadow',91,223,190,'#CFAD8C',{parentId:hero,opacity:.45,scale:.58});c.rect('Vase body',123,77,119,157,'#F3E3CB',{parentId:hero,radius:48,rotation:-8});c.rect('Vase neck',154,40,55,76,'#F3E3CB',{parentId:hero,radius:16,rotation:-8});c.orb('Vase opening',155,35,53,'#B89A76',{parentId:hero});c.button('New badge','NEW OBJECT',18,18,113,30,'#FFF5E0','#8A725A',{parentId:hero,fontSize:9,radius:15});
  c.text('Product name','The Sunday Vase',25,658,290,31,23,'#715A48',600);c.text('Price','$48',321,665,65,27,20,'#9A785E',600);c.text('Detail','Hand-finished stoneware · Sand',25,705,360,24,12,'#AD9784');
  ['#BDA68D','#E0C7A6','#A4AE99'].forEach((fill,i)=>c.orb('Color option '+i,26+i*37,751,25,fill,{stroke:i===0?'#77644F':undefined,strokeWidth:i===0?2:0}));c.button('Add to bag','Add to bag                            +',24,816,364,58,'#80654F','#FBF1E5');return c.done();
}

function portfolioWeb():DesignPage {
  const c=canvas('Mira · Designer portfolio','web',1440,1000,'#F3EEE6');c.text('Brand','mira /',64,42,280,42,27,'#4E5144',650);c.text('Navigation','Selected work       About       Notes',858,54,515,26,14,'#878978');c.rect('Top divider',64,110,1312,1,'#DAD9CD',{radius:0});
  c.text('Eyebrow','INDEPENDENT DESIGNER & VISUAL THINKER',65,168,1190,24,11,'#91937E',600,{letterSpacing:2});c.text('Headline','Thoughtful design.\nA little unexpected.',56,236,1300,194,76,'#424B3A',600,{letterSpacing:-3,lineHeight:1.12});c.text('Introduction','I turn complex ideas into clear, human experiences.\nCurrently crafting digital products in Seoul.',65,479,1000,68,20,'#969A83');c.button('Contact','Let’s make something  ↗',1040,488,334,55,'#D4DDBB','#4C5D3C');
  [['01 / HALO','A calmer financial future.','#C8D9CC'],['02 / FORMA','A home for good ideas.','#D8D0E3']].forEach(([tag,title,fill],i)=>{const x=64+i*672;c.rect('Project card '+i,x,624,640,296,fill,{radius:28});c.rect('Device shadow '+i,x+293,677,230,148,i===0?'#789A86':'#9685A8',{rotation:-6,radius:19});c.rect('Device display '+i,x+312,694,192,110,i===0?'#ECF4E7':'#F2EAF7',{rotation:-6,radius:12});c.text('Project tag '+i,tag,x+26,653,400,20,10,'#718773',650,{letterSpacing:1.5});c.text('Project title '+i,title,x+26,840,540,34,23,'#4F6451',600);});c.text('Footer','AVAILABLE FOR SELECT COLLABORATIONS  /  2026',66,954,1250,21,10,'#A5A692',550,{letterSpacing:1.6});return c.done();
}

function analyticsWeb():DesignPage {
  const c=canvas('Clarity · Analytics dashboard','web',1440,960,'#F4F5FA');c.rect('Top navigation',24,24,1392,72,'#FFFFFF');c.text('Brand','clarity',49,42,290,37,27,'#5C5483',700);c.text('Navigation','Overview       Reports       Audience       Settings',480,52,690,26,14,'#9D97B3');c.button('Date filter','This month  ⌄',1218,42,171,38,'#EEEAF7','#8E80AC');
  c.text('Heading','A clear view of what’s next.',42,144,1250,53,35,'#4C4565',600);c.text('Description','Your business, one meaningful signal at a time.',44,213,1200,28,16,'#A59CB6');
  [['Revenue','$48,290','↑ 18.6%'],['Active users','12,840','↑ 8.4%'],['Conversion','6.42%','↑ 2.1%']].forEach(([title,value,trend],i)=>{const x=42+i*457;c.rect('Metric '+title,x,282,442,156,'#FFFFFF');c.text('Metric label '+title,title,x+24,304,390,22,12,'#A79CB9');c.text('Metric value '+title,value,x+22,348,290,47,34,'#60507C',650);c.text('Metric trend '+title,trend,x+325,366,100,24,13,'#8EAD86',650);});
  c.rect('Revenue chart',42,467,881,437,'#FFFFFF',{radius:27});c.text('Chart title','Revenue over time',66,494,800,33,21,'#695580',600);c.text('Chart description','A steady rhythm of growth.',66,545,800,23,13,'#B1A4BF');[0,1,2,3].forEach(i=>c.rect('Grid '+i,75,619+i*64,808,1,'#F1EBF6',{radius:0}));
  [74,101,88,133,164,151,193,215,187,242,224,258].forEach((h,i)=>c.rect('Revenue bar '+i,87+i*65,850-h,38,h,i===11?'#8870BD':'#DFD4EE',{radius:9}));c.text('Chart months','JAN       FEB       MAR       APR       MAY       JUN',81,871,800,18,10,'#B2A3BD',550);
  c.rect('Audience panel',947,467,451,437,'#E9E2F3',{radius:27});c.text('Audience title','People, not just numbers.',972,496,399,34,20,'#766189',600);c.orb('Audience ring',1073,568,194,'#BBA7D4');c.orb('Audience hole',1110,605,120,'#E9E2F3');c.text('Audience percentage','74%',1130,646,95,36,30,'#745C95',650);[['Returning visitors','74%'],['First-time visitors','26%']].forEach(([v,n],i)=>{c.text('Legend '+i,v,975,809+i*38,300,24,13,'#917AAB');c.text('Legend value '+i,n,1310,809+i*38,66,24,14,'#8567A6',650);});return c.done();
}

function eventSquare():DesignPage {
  const c=canvas('Afterhours · Event poster','banner',1080,1080,'#202932');c.text('Series','AFTERHOURS / SESSIONS',65,58,950,40,20,'#B1C8BB',650,{letterSpacing:4});c.text('Issue','NO. 004',830,128,190,30,15,'#8BABA0',500,{textAlign:'right',letterSpacing:2});
  [510,382,254,126].forEach((size,i)=>c.orb('Sound circle '+i,285+(510-size)/2,236+(510-size)/2,size,['#496D65','#719688','#A2B8A0','#DBE1B5'][i],{animation:'pulse',duration:5}));
  c.text('Event title','Stay for\nthe feeling.',57,558,970,227,96,'#EAF0D9',600,{letterSpacing:-4,lineHeight:1.08});c.text('Event description','AN EVENING OF SOUND, DESIGN & GOOD COMPANY',66,844,946,29,15,'#ABC0A9',600,{letterSpacing:2});c.rect('Footer divider',66,904,948,1,'#5C776D',{radius:0});c.text('Date','FRIDAY / NOV 06',66,945,600,40,23,'#DDE7C4',600);c.text('Location','SEOUL  ·  7 PM',651,950,365,30,19,'#A8BDAC',500,{textAlign:'right'});return c.done();
}

function storyBanner():DesignPage {
  const c=canvas('Aura · Social story','banner',1080,1920,'#E8DFD0');c.text('Brand','aura / objects',78,87,924,52,35,'#66574A',600);c.text('Edition','THE SLOW LIVING EDIT',80,207,920,32,18,'#A18D77',600,{letterSpacing:4});c.text('Title','Good things\ntake their time.',68,305,940,221,86,'#675342',600,{lineHeight:1.12,letterSpacing:-3});
  c.rect('Object alcove',79,627,922,807,'#CDB99F',{radius:340});c.orb('Soft shadow',283,1206,530,'#B99F83',{opacity:.45,scale:.65});c.rect('Pedestal',232,1207,616,217,'#D7C6AD',{radius:18});c.rect('Sculpture body',361,922,357,349,'#E8DCC7',{radius:115,rotation:-7});c.rect('Sculpture neck',428,790,199,225,'#E8DCC7',{radius:46,rotation:-7});c.orb('Sculpture opening',445,764,171,'#A79274');c.orb('Floating sphere',194,778,160,'#F1E6CF',{animation:'float',duration:7});
  c.text('Collection','Less, but a little more meaningful.',80,1520,920,54,30,'#8F785F',500,{textAlign:'center'});c.button('Discover collection','Discover the collection    ↗',155,1665,770,105,'#7C6652','#FBF2DE',{fontSize:28,radius:52});c.text('Footer','CRAFTED WITH CARE  /  MADE TO STAY',80,1820,920,29,15,'#AB977E',600,{textAlign:'center',letterSpacing:2});return c.done();
}

function saleBanner():DesignPage {
  const c=canvas('Forma · Wide launch banner','banner',1920,640,'#DDE4E0');c.text('Brand','FORMA / STUDIO',64,48,1200,35,20,'#596D62',650,{letterSpacing:3});c.text('Eyebrow','THE NEW EVERYDAY COLLECTION',66,157,1280,29,14,'#829C8C',600,{letterSpacing:3});c.text('Headline','Room for what matters.',58,224,1540,102,76,'#3E5949',600,{letterSpacing:-3});c.text('Description','Considered objects. Quiet details. A fresh perspective.',66,372,1170,39,23,'#819B87');c.button('Shop collection','Explore the collection   ↗',66,475,385,77,'#4F725A','#F4F6E6',{fontSize:21,radius:25});
  c.orb('Product aura',1460,73,410,'#B7CBB9');c.rect('Product pedestal',1412,451,441,124,'#C9D6C5',{radius:16});c.rect('Product body',1527,239,200,246,'#8EA88B',{radius:72,rotation:8});c.rect('Product neck',1574,149,96,144,'#8EA88B',{radius:23,rotation:8});c.orb('Product opening',1574,142,92,'#667F67');c.text('Edition','AUTUMN / 2026',1485,590,351,24,13,'#8DA38B',600,{letterSpacing:2});return c.done();
}

function pitchSlide():DesignPage {
  const c=canvas('Northstar · Product pitch','slide',1920,1080,'#202D35');c.text('Brand','northstar /',92,64,1450,53,36,'#D9E6DE',650);c.text('Issue','PRODUCT VISION / 2026',1352,81,468,25,16,'#8BA69D',550,{textAlign:'right',letterSpacing:2});c.text('Eyebrow','BETTER TOOLS. MORE HUMAN WORK.',94,263,1700,30,16,'#9DBCAD',600,{letterSpacing:4});c.text('Title','Less friction.\nMore possibility.',78,369,1710,268,116,'#E7F1DC',600,{lineHeight:1.06,letterSpacing:-4});c.text('Description','A connected workspace for teams who care about\nthe work they put into the world.',94,737,1550,94,30,'#A3BBAA');c.rect('Footer line',94,956,1732,1,'#506B62',{radius:0});c.text('Presenter','PRESENTED BY THE NORTHSTAR TEAM',94,999,1600,25,15,'#829F90',600,{letterSpacing:2});c.text('Page number','01',1720,995,100,32,20,'#A8C1AD',600,{textAlign:'right'});return c.done();
}

function metricsSlide():DesignPage {
  const c=canvas('Northstar · Results slide','slide',1920,1080,'#EFF0E9');c.text('Brand','northstar /',92,65,1600,47,33,'#60735E',650);c.text('Eyebrow','THE YEAR IN NUMBERS',94,205,1700,28,15,'#9AA58B',600,{letterSpacing:3});c.text('Title','Small steps. Real impact.',88,288,1730,91,71,'#4B634A',600,{letterSpacing:-2});
  [['24k','Monthly active teams','A growing community of thoughtful makers.'],['98.4%','Customer satisfaction','Built around the people who use it.'],['3.2×','Faster to the first idea','More time for the work that matters.']].forEach(([value,label,body],i)=>{const x=94+i*581;c.rect('Metric card '+i,x,459,550,399,i===1?'#D5DFCB':'#E3E7DA',{radius:32});c.text('Metric number '+i,value,x+35,506,480,111,82,'#5E7A50',650,{letterSpacing:-3});c.text('Metric label '+i,label,x+35,660,480,39,27,'#6C825B',600);c.text('Metric context '+i,body,x+35,744,460,69,21,'#98A38A');});c.text('Footer','ILLUSTRATIVE DATA / REPLACE WITH YOUR OWN RESULTS',95,1000,1570,25,14,'#B0B5A4',550,{letterSpacing:1.8});c.text('Page number','02',1720,998,100,30,20,'#A3AE95',600,{textAlign:'right'});return c.done();
}

function roadmapSlide():DesignPage {
  const c=canvas('Northstar · Roadmap slide','slide',1920,1080,'#F4EDF1');c.text('Brand','northstar /',92,65,1600,47,33,'#82667E',650);c.text('Eyebrow','FROM INTENTION TO ACTION',94,205,1700,28,15,'#AD91A7',600,{letterSpacing:3});c.text('Title','Make the next chapter count.',88,288,1730,91,71,'#6F4F6D',600,{letterSpacing:-2});c.rect('Timeline connector',168,526,1538,4,'#D8C6D6',{radius:2});
  [['01','Discover','Listen closely.\nUnderstand the real problem.','#B69DB4'],['02','Design','Explore openly.\nMake room for the unexpected.','#A98AA8'],['03','Build','Work together.\nTurn the shared idea into reality.','#947292'],['04','Refine','Learn from people.\nKeep making it a little better.','#7A5979']].forEach(([number,title,body,fill],i)=>{const x=94+i*441;c.orb('Milestone '+i,x+8,496,62,fill);c.text('Milestone number '+i,number,x+20,515,40,28,18,'#FFF3FD',650);c.text('Milestone title '+i,title,x,613,410,56,36,'#856180',650);c.text('Milestone detail '+i,body,x,709,400,98,23,'#B095AA');c.text('Quarter '+i,'Q'+(i+1)+' / 2027',x,874,410,26,16,'#BDA5B6',600,{letterSpacing:2});});c.text('Footer','A ROADMAP IS A CONVERSATION, NOT A CONTRACT.',95,1000,1570,25,14,'#BAA3B3',550,{letterSpacing:1.8});c.text('Page number','03',1720,998,100,30,20,'#AD91A7',600,{textAlign:'right'});return c.done();
}

export const extraTemplates:{id:string;name:string;description:string;kind:PageKind;create:()=>DesignPage}[]=[
  {id:'flow-planner',name:'Flow · 팀 작업 보드',description:'칸반 카드·팀 탐색·업무 상태를 편집하는 Windows 앱',kind:'desktop',create:flowboard},
  {id:'echo-desktop',name:'Echo · 데스크톱 음악',description:'앨범 아트·재생 목록·플레이어와 오빗 모션',kind:'desktop',create:desktopSound},
  {id:'atlas-travel',name:'Atlas · 여행 예약',description:'풍경 일러스트·목적지 카드·모바일 탐색 UI',kind:'mobile',create:travelApp},
  {id:'bloom-shop',name:'Bloom · 라이프스타일 숍',description:'상품 상세·색상 옵션·장바구니 버튼',kind:'mobile',create:shopApp},
  {id:'mira-portfolio',name:'Mira · 포트폴리오',description:'큰 타이포그래피와 프로젝트 목업을 담은 웹사이트',kind:'web',create:portfolioWeb},
  {id:'clarity-analytics',name:'Clarity · 분석 대시보드',description:'수익 차트·지표 카드·방문자 분석 웹 UI',kind:'web',create:analyticsWeb},
  {id:'afterhours-square',name:'Afterhours · 이벤트 포스터',description:'1080×1080 정사각형 공연·이벤트 디자인',kind:'banner',create:eventSquare},
  {id:'aura-story',name:'Aura · 소셜 스토리',description:'1080×1920 세로형 상품 소개와 입체 도형',kind:'banner',create:storyBanner},
  {id:'forma-wide',name:'Forma · 와이드 론칭',description:'1920×640 캠페인 배너와 컬렉션 소개',kind:'banner',create:saleBanner},
  {id:'northstar-pitch',name:'Northstar · 제품 소개',description:'제품 비전과 핵심 메시지를 소개하는 표지',kind:'slide',create:pitchSlide},
  {id:'northstar-metrics',name:'Northstar · 성과 지표',description:'세 가지 수치와 설명을 담은 발표용 슬라이드',kind:'slide',create:metricsSlide},
  {id:'northstar-roadmap',name:'Northstar · 로드맵',description:'4단계 분기 계획과 마일스톤 프레젠테이션',kind:'slide',create:roadmapSlide},
];
