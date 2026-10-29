import {ASSETS,AssetBank,sprite,fitSprite,drawScene,entityAt,GATES} from './renderer.mjs';
import {COLORS,NAMES,LOCATIONS,newState,collect,place,missionState,missionAction,findPath,walkable,advancePath,normalizedPoint} from './core.mjs';

const $=id=>document.getElementById(id), bank=new AssetBank();
const canvas=$('world-canvas'),ctx=canvas.getContext('2d');
let state=newState(),region='hub',screenName='opening',player={x:.50,y:.88,direction:0,moving:false};
let route=0,busy=false,path=[],arrival=null,marker=null,activeMission=null,closing=null,lastFocus=null,festival=false,celebrate=false;
let keys=new Set(),sound=true,audio=null,lastTime=0,toastTimer=null,loadAttempt=0;
try{sound=localStorage.getItem('rainbow-sound')!=='off';}catch{}
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const openingVideo=$('opening-video');
openingVideo.muted=!sound;
openingVideo.volume=1;
$('opening-sound').textContent=sound?'🔊':'🔇';
$('opening-sound').setAttribute('aria-label',sound?'오프닝 소리 끄기':'오프닝 소리 켜기');

function syncJourneyHeight(){
  const height=$('map-frame').getBoundingClientRect().height;
  if(height)$('journey-panel').style.setProperty('--map-height',height+'px');
}
if('ResizeObserver' in window)new ResizeObserver(syncJourneyHeight).observe($('map-frame'));
window.addEventListener('resize',syncJourneyHeight);

function element(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function button(text,cls,action){const n=element('button',cls,text);n.addEventListener('click',action);return n;}
function imageCanvas(id,index,w=180,h=180){const c=element('canvas');c.width=w;c.height=h;fitSprite(c.getContext('2d'),bank,id,index,w,h);c.setAttribute('aria-hidden','true');return c;}
function stopWalking(){path=[];arrival=null;marker=null;keys.clear();player.moving=false;}
function save(){updateHUD();}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true;},3300);}
function speak(text){if(!sound||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=.87;utterance.pitch=1.1;const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.lang.startsWith('ko'));if(voice)utterance.voice=voice;window.speechSynthesis.speak(utterance);}
function tone(success=false){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();[0,...(success?[.13,.26]:[])].forEach((offset,i)=>{const osc=audio.createOscillator(),g=audio.createGain();osc.type='sine';osc.frequency.value=[523,659,784][i];g.gain.setValueAtTime(.001,audio.currentTime+offset);g.gain.exponentialRampToValueAtTime(.10,audio.currentTime+offset+.025);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+offset+.25);osc.connect(g);g.connect(audio.destination);osc.start(audio.currentTime+offset);osc.stop(audio.currentTime+offset+.28);});}catch{}}
function screen(name){
  screenName=name;
  ['opening','title','choose','world'].forEach(n=>{$(n+'-screen').hidden=n!==name;});
  if(name!=='opening')stopOpening();
  stopWalking();
}
function stopOpening(){
  const video=openingVideo;
  video.pause();
  video.currentTime=0;
  $('opening-play').textContent='▶ 오프닝 재생';
  $('opening-status').textContent='재생을 누르면 소리와 함께 시작해요';
}
async function playOpening(){
  const video=openingVideo;
  video.muted=!sound;
  video.volume=1;
  $('opening-status').textContent='오프닝을 재생하고 있어요';
  $('opening-play').textContent='❚❚ 잠시 멈추기';
  try{await video.play();}catch(error){
    $('opening-status').textContent='재생 버튼을 한 번 더 눌러 주세요.';
    $('opening-play').textContent='▶ 오프닝 보기';
    console.error(error);
  }
}
function toggleOpening(){
  const video=openingVideo;
  if(video.paused)playOpening();
  else {video.pause();$('opening-status').textContent='잠시 멈췄어요';$('opening-play').textContent='▶ 이어 보기';}
}
function finishOpening(){screen('title');}
function closeModal(){if(activeMission?.complete)return;const fn=closing;closing=null;activeMission=null;$('overlay').hidden=true;$('modal').replaceChildren();if('speechSynthesis'in window)window.speechSynthesis.cancel();if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});fn?.();}
function modal(title,onClose=null){stopWalking();if($('overlay').hidden)lastFocus=document.activeElement;closing=onClose;$('modal').replaceChildren();$('overlay').hidden=false;const header=element('div','modal-title-row'),heading=element('h2',null,title);heading.id='modal-title';header.append(heading,button('×','close-button',closeModal));header.lastChild.setAttribute('aria-label','닫기');$('modal').append(header);$('modal').focus({preventScroll:true});return $('modal');}
function dismiss(){activeMission=null;closing=null;$('overlay').hidden=true;$('modal').replaceChildren();if('speechSynthesis'in window)window.speechSynthesis.cancel();}
function dialogue(npc,name,text,actions){const m=modal(name+'의 이야기');const body=element('div','dialog-body'),portrait=imageCanvas('02-friends',npc);portrait.className='npc-portrait';const words=element('div','dialog-text');words.append(element('h3',null,name),element('p',null,text));body.append(portrait,words);m.append(body);const controls=element('div','dialog-actions');controls.append(button('🔈 다시 듣기','secondary',()=>speak(text)));for(const a of actions)controls.append(button(a.text,a.primary?'primary':'secondary',()=>{dismiss();a.action();}));m.append(controls);speak(text);}
function intro(){dialogue(1,'후우','축제를 돕고 싶어서 바람을 불었는데, 일곱 무지개 구슬이 멀리 날아갔어. 구슬을 함께 찾아줄래?',[{text:'함께 찾아요!',primary:true,action:()=>dialogue(0,'몽실','친구들을 만나서 도와주자! 구슬을 모두 모으면 광장의 무지개 나무에 돌려놓을 수 있어. 가고 싶은 곳을 톡 눌러 봐!',[{text:'모험을 떠나요',primary:true,action:()=>{}}])}]);}
function updateHUD(){
  const tray=$('orb-tray');tray.replaceChildren();
  for(let i=0;i<7;i++){const n=element('div','orb'+(state.collected.includes(i)?'':' missing'));n.title=NAMES[i]+' 구슬 '+(state.collected.includes(i)?'찾음':'아직 찾지 않음');n.setAttribute('aria-label',n.title);n.append(imageCanvas('01-rainbow-orbs',state.collected.includes(i)?i:7,60,60));tray.append(n);}
  tray.append(element('span','orb-count',state.collected.length+' / 7'));
  $('journey-progress').textContent='구슬 '+state.collected.length+'개를 찾았어요';
  $('tree-button').hidden=state.collected.length!==7;$('tree-button').textContent=state.finished?'🌈 무지개 축제를 다시 봐요':'🌈 무지개 나무로 가요';
  const list=$('location-list');list.replaceChildren();
  LOCATIONS.forEach((l,i)=>{const b=button('','location-button'+(region===l.id?' active':''),()=>navigate(l.id));const label=l.name+(state.collected.includes(i)?', 구슬 찾음':'');b.setAttribute('aria-label',label);b.title=label;b.append(element('span','location-emoji',l.icon));const t=element('span','location-copy');t.append(element('strong',null,l.name),element('small',null,l.verb));b.append(t,element('span','check',state.collected.includes(i)?'✓':'›'));list.append(b);});
  const l=LOCATIONS.find(l=>l.id===region);$('place-name').textContent=l?.name||'중앙광장';$('place-title').textContent=l?.name||(festival?'무지개 축제':'중앙광장');$('place-icon').textContent=l?.icon||'🌳';$('hub-button').hidden=region==='hub';
  $('action-button').textContent=region==='hub'?(state.collected.length===7?'무지개 나무로 가요':'몽실과 이야기하기'):(state.collected.includes(LOCATIONS.indexOf(l))?'친구와 이야기하기':'친구를 도와요');
  $('map-hint').textContent=festival?'무지개 나라에 색이 돌아왔어요!':region==='hub'?'장소 그림을 톡 누르면 걸어가요':'친구를 톡 누르거나 길을 걸어 봐요';
  $('sound-toggle').textContent=sound?'🔊':'🔇';$('sound-toggle').setAttribute('aria-label',sound?'소리 끄기':'소리 켜기');
}
async function boot(){
  const attempt=++loadAttempt;$('new-game').disabled=true;$('retry-load').hidden=true;$('new-game').textContent='모험 준비 중…';
  const essentials=['19-title-background','17-hero-boy-transparent','18-hero-girl-transparent','01-rainbow-orbs','02-friends','background-hub'];let n=0;
  try{await Promise.all(essentials.map(async id=>{await bank.load(id);if(attempt===loadAttempt)$('load-status').textContent='모험 준비 '+(++n)+' / '+essentials.length;}));if(attempt!==loadAttempt)return;
    $('new-game').disabled=false;$('new-game').textContent='모험 시작하기';$('load-status').textContent='준비됐어요! 함께 떠나요';
    document.querySelectorAll('.hero-card').forEach(card=>fitSprite(card.querySelector('canvas').getContext('2d'),bank,card.dataset.hero==='boy'?'17-hero-boy-transparent':'18-hero-girl-transparent',24,280,300));updateHUD();
  }catch(error){if(attempt!==loadAttempt)return;$('load-status').textContent='그림을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.';$('retry-load').hidden=false;console.error(error);}
}
async function start(hero){
  dismiss();state=newState(hero);festival=false;celebrate=false;screen('world');save();
  const arrived=await navigate('hub');if(!arrived)return;intro();
}
async function navigate(id){
  if(screenName!=='world')return;const token=++route;stopWalking();dismiss();busy=true;$('scene-loading').hidden=false;
  const l=LOCATIONS.find(l=>l.id===id);
  try{await Promise.all((l?[l.asset,l.props]:['background-hub']).map(k=>bank.load(k)));if(token!==route)return;
    region=l?id:'hub';festival=false;celebrate=false;player.x=.50;player.y=.88;player.direction=0;busy=false;$('scene-loading').hidden=true;updateHUD();canvas.focus({preventScroll:true});
    if(l){tone();toast(l.name+'에 도착했어요!');speak(l.name+'에 도착했어. '+l.friend+'를 만나 보자!');}return true;
  }catch(error){if(token!==route)return false;busy=false;$('scene-loading').hidden=true;dialogue(0,'몽실','이곳의 그림을 아직 불러오지 못했어. 다시 불러와 볼까?',[{text:'다시 불러오기',primary:true,action:()=>navigate(id)},{text:'광장으로',action:()=>navigate('hub')}]);console.error(error);return false;}
}
function walkTo(x,y,onArrive=null){if(busy||!$('overlay').hidden)return;const p=findPath(region,player,{x,y});if(!p.length){toast('가까운 길을 톡 눌러 주세요');return;}path=p;arrival=onArrive;marker=p.at(-1);}
function interact(entity){
  if(!entity||busy)return;
  if(entity.type==='gate')navigate(LOCATIONS[entity.index].id);
  if(entity.type==='guide')guide();
  if(entity.type==='tree')showTree();
  if(entity.type==='friend')friend(entity.index);
}
function guide(){if(state.collected.length===7){showTree();return;}const remaining=7-state.collected.length;dialogue(0,'몽실','친구들을 도우면 무지개 구슬을 찾을 수 있어. 앞으로 '+remaining+'개를 더 찾아보자! 장소 그림을 눌러서 떠나 보자.',[{text:'모험을 계속해요',primary:true,action:()=>{}}]);}
function friend(index){const l=LOCATIONS[index],done=state.collected.includes(index);dialogue(l.npc,l.friend,done?'고마워! 축제에서 다시 만나자. '+l.thanks:l.intro,[{text:done?'다시 놀아요':'도와줄게!',primary:true,action:()=>openMission(index)},{text:'조금 더 둘러볼래요',action:()=>{}}]);}

function missionObject(stage,id,frame,x,y,w,h,action,label,classes='',disabled=false){
  const b=button('','mission-object '+classes,action||(()=>{}));b.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%;transform:translate(-50%,-50%)`;b.setAttribute('aria-label',label);b.disabled=disabled;b.append(imageCanvas(id,frame,210,210));stage.append(b);return b;
}
function openMission(index){
  const l=LOCATIONS[index];activeMission={index,model:missionState(l.id)};renderMission();speak(l.intro);
}
function act(action,value){
  const current=activeMission;if(!current)return;
  const result=missionAction(current.model,action,value);
  if(result.gentle){tone();speak(current.model.id==='flower'?'먼저 물뿌리개를 눌러 줘.':current.model.id==='forest'?'가지와 잎을 모두 모아 보자.':'같은 그림을 찾아보자. 괜찮아, 다시 해 보자!');toast(current.model.id==='flower'?'물뿌리개를 먼저 눌러요':current.model.id==='forest'?'가지와 잎을 모두 모아 주세요':'같은 모양을 찾아 다시 눌러요');return;}
  if(result.changed)tone();renderMission();
  if(result.complete){tone(true);setTimeout(()=>{if(activeMission===current)reward(current.index);},reduced?200:750);}
}
function renderMission(){
  const current=activeMission;if(!current)return;const {index,model:m}=current,l=LOCATIONS[index],P=l.props;
  const remembered=document.activeElement?.getAttribute('aria-label');
  const root=modal(l.name+'에서 놀아요');activeMission=current;
  const instructions={flower:m.selected?'꽃을 톡 눌러 물을 주어요':'물뿌리개를 먼저 눌러요',orchard:'과일을 찾아 톡 눌러요',hill:m.selected===null?'그림 조각을 먼저 눌러요':'같은 모양의 빈자리를 눌러요',forest:m.done.length===4?'이제 둥지를 눌러 고쳐요':'가지와 잎을 톡 눌러 모아요',pond:'물길을 막은 가지를 톡 눌러요',night:'별등을 톡 눌러 깨워요',castle:'왼쪽 위의 그림과 같은 버튼을 눌러요'};
  root.append(element('p','mission-instruction',m.complete?'참 잘했어요!':instructions[l.id]));const stage=element('div','mission-stage');root.append(stage);
  const obj=(f,x,y,w,h,a,label,cls='',dis=false)=>missionObject(stage,P,f,x,y,w,h,a,label,cls,dis||m.complete);
  if(l.id==='flower'){
    [.20,.50,.80].forEach((x,i)=>obj(m.done.includes(i)?2:1,x*100,40,24,55,()=>act('flower',i),i+1+'번째 꽃',m.done.includes(i)?'':'selectable'));
    obj(0,50,82,27,34,()=>act('tool'), '물뿌리개',m.selected?'selected':'selectable');
  }
  if(l.id==='orchard'){
    [[17,25],[80,27],[49,20]].forEach(([x,y],i)=>{if(!m.done.includes(i))obj(i%2,x,y,23,29,()=>act('fruit',i),'과일 '+(i+1),'fruit');});
    obj(m.complete?3:2,50,73,37,50,null,'과일 바구니','',true);
    if(!m.complete)m.done.forEach((i,n)=>obj(i%2,42+n*8,69,10,15,null,'바구니에 담은 과일','',true));
  }
  if(l.id==='hill'){
    obj(m.complete?1:0,50,22,35,40,null,'해님 그림','',true);
    [.20,.50,.80].forEach((x,i)=>{
      const slot=obj(i+2,x*100,52,23,25,()=>act('slot',i),'그림 조각 '+(i+1)+'의 자리','selectable');slot.style.opacity=m.done.includes(i)?'1':'.35';slot.style.borderStyle='dashed';
      if(!m.done.includes(i))obj(i+2,x*100,83,23,26,()=>act('piece',i),'그림 조각 '+(i+1),m.selected===i?'selected':'selectable');
    });
  }
  if(l.id==='forest'){
    [14,38,62,86].forEach((x,i)=>{if(!m.done.includes(i))obj(i+2,x,23,22,28,()=>act('material',i),i<2?'나뭇가지 '+(i+1):'나뭇잎 '+(i-1),'selectable');});
    obj(m.complete?1:0,50,68,43,51,()=>act('repair'),'새 둥지',m.done.length===4?'selected':'');
  }
  if(l.id==='pond'){
    stage.style.background='linear-gradient(90deg,#e7f0dc 0 29%,#c6e9f1 29% 68%,#e7f0dc 68%)';
    [0,1,2].forEach(i=>obj(i,m.done.includes(i)?86:49,23+i*27,m.done.includes(i)?23:54,25,()=>act('branch',i),'나뭇가지 '+(i+1),'',m.done.includes(i)));
    if(m.complete)obj(3,49,57,28,50,null,'흐르는 물','',true);
  }
  if(l.id==='night'){
    stage.style.background='linear-gradient(160deg,#454c83,#8582b1)';
    [0,1,2,3,4,5].forEach(i=>obj(m.done.includes(i)?1:0,18+(i%3)*32,i<3?27:75,25,45,()=>act('star',i),(i+1)+'번째 별등'));
  }
  if(l.id==='castle'){
    obj(m.complete?1:0,52,41,43,48,null,'오르골','',true);
    if(!m.complete)obj(2+m.step,15,19,18,26,null,'지금 찾을 그림','selectable',true);
    [0,1,2].forEach(i=>obj(i+2,22+i*28,81,23,29,()=>act('symbol',i),['별 버튼','달 버튼','구름 버튼'][i],'selectable'));
    if(m.complete)obj(5,83,25,16,28,null,'음악','',true);
  }
  const max=l.id==='night'?6:l.id==='forest'?4:3,count=l.id==='castle'?m.step:m.done.length,dots=element('div','mission-progress');for(let i=0;i<max;i++)dots.append(element('span','progress-dot'+(i<count?' done':'')));dots.setAttribute('aria-label',max+'개 중 '+count+'개 완료');root.append(dots);
  root.append(element('p','mission-helper','틀려도 괜찮아요. 천천히 다시 해 보아요.'));
  const controls=element('div','modal-actions');controls.append(button('🔈 다시 듣기','quiet',()=>speak(instructions[l.id])));root.append(controls);
  if(m.complete)root.querySelector('.close-button').disabled=true;
  if(remembered)Array.from(root.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')===remembered&&!b.disabled)?.focus({preventScroll:true});
}
function reward(index){
  const l=LOCATIONS[index],first=collect(state,index);save();activeMission=null;
  const root=modal('무지개 구슬을 찾았어요!',()=>{}),body=element('div','reward'),ball=imageCanvas('01-rainbow-orbs',index,250,250);ball.className='reward-orb';body.append(ball,element('h2',null,NAMES[index]+' 구슬을 찾았어요!'),element('p',null,l.thanks));body.append(element('small',null,first?'우리의 무지개에 색이 하나 더 돌아왔어요':'이미 찾은 구슬이에요. 친구와 다시 놀았어요!'));root.append(body);
  const controls=element('div','dialog-actions');controls.append(button('광장으로 돌아가요','primary',()=>{dismiss();navigate('hub');}),button('조금 더 둘러봐요','secondary',()=>{dismiss();updateHUD();}));root.append(controls);speak(l.thanks);tone(true);
}
function showTree(){
  if(state.finished){endFestival();return;}if(state.collected.length<7){guide();return;}
  const begin=()=>{if(region!=='hub')navigate('hub').then(ok=>{if(ok)treePlacement();});else treePlacement();};
  if(state.placed.length===0)dialogue(1,'후우','구슬을 날려 버려서 미안해. 이번에는 바람을 살살 불어 줄게! 함께 구슬을 무지개 나무에 돌려놓자.',[{text:'함께 돌려놓아요',primary:true,action:begin}]);else begin();
}
function treePlacement(){
  const root=modal('무지개를 함께 되찾아요'),guide=element('p','tree-guide','구슬을 하나씩 톡 눌러 나무에 넣어요');root.append(guide);
  const row=element('div','tree-sockets');
  for(let i=0;i<7;i++){
    const put=state.placed.includes(i),b=button('','socket-button'+(put?' placed':''),()=>{if(!place(state,i))return;save();tone(true);if(state.finished){dismiss();endFestival();}else treePlacement();});
    b.disabled=put;b.setAttribute('aria-label',NAMES[i]+' 구슬 '+(put?'넣었어요':'넣기'));b.append(imageCanvas('01-rainbow-orbs',i,90,90));row.append(b);
  }
  root.append(row,element('p','mission-helper',state.placed.length+'개의 구슬을 돌려놓았어요'));speak('구슬을 하나씩 톡 눌러 무지개 나무에 넣어 줘.');
}
async function endFestival(showCard=true){
  const token=++route;busy=true;$('scene-loading').hidden=false;stopWalking();dismiss();
  try{await bank.load('20-festival-ending');if(token!==route)return;region='hub';festival=true;celebrate=true;player.x=.5;player.y=.86;busy=false;$('scene-loading').hidden=true;updateHUD();tone(true);speak('우리 함께 무지개를 되찾았어요! 이제 친구들과 축제를 즐겨요!');
    if(showCard){const root=modal('무지개 축제가 시작됐어요!'),card=element('div','festival-card');card.append(imageCanvas('02-friends',0,120,120),element('h2',null,'우리 함께 무지개를 되찾았어요!'),element('p',null,'꽃과 과일, 노래와 별빛이 모였어요.\n친구들이 모두 여러분을 기다려요!'));root.append(card);const controls=element('div','dialog-actions');controls.append(button('축제를 구경해요','primary',dismiss),button('처음 화면으로','secondary',()=>{dismiss();screen('title');}));root.append(controls);}
  }catch(error){busy=false;$('scene-loading').hidden=true;toast('축제 그림을 다시 불러올게요');dialogue(0,'몽실','무지개 구슬은 모두 돌아왔어! 축제 그림을 다시 불러와 볼까?',[{text:'다시 불러오기',primary:true,action:()=>endFestival()}]);console.error(error);}
}
function menu(){
  const root=modal('잠깐 쉬어 갈까요?'),list=element('div','menu-list');root.append(list);
  list.append(button('모험으로 돌아가기','primary',closeModal),button('처음 화면으로','secondary',()=>{dismiss();screen('title');}),button('새 모험 시작하기','secondary',()=>{dismiss();confirmNew();}));
  root.append(element('p','rotate-hint','태블릿을 가로로 돌리면 더 넓게 볼 수 있어요.'));
}
function confirmNew(){screen('choose');}

$('new-game').addEventListener('click',confirmNew);$('retry-load').addEventListener('click',boot);
$('opening-play').addEventListener('click',toggleOpening);$('opening-skip').addEventListener('click',finishOpening);
$('opening-sound').addEventListener('click',()=>{sound=!sound;try{localStorage.setItem('rainbow-sound',sound?'on':'off');}catch{}openingVideo.muted=!sound;openingVideo.volume=1;$('opening-sound').textContent=sound?'🔊':'🔇';$('opening-sound').setAttribute('aria-label',sound?'오프닝 소리 끄기':'오프닝 소리 켜기');$('opening-status').textContent=sound?'소리를 켰어요':'소리를 껐어요';});
$('opening-video').addEventListener('ended',finishOpening);
$('opening-video').addEventListener('error',()=>{$('opening-status').textContent='영상을 불러오지 못했어요. 건너뛰기를 눌러 모험을 시작할 수 있어요.';});
$('choose-back').addEventListener('click',()=>screen('title'));document.querySelectorAll('[data-hero]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.hero)));
$('hub-button').addEventListener('click',()=>navigate('hub'));$('tree-button').addEventListener('click',showTree);$('menu-button').addEventListener('click',menu);
$('action-button').addEventListener('click',()=>region==='hub'?(state.collected.length===7?showTree():guide()):friend(LOCATIONS.findIndex(l=>l.id===region)));
$('sound-toggle').addEventListener('click',()=>{sound=!sound;try{localStorage.setItem('rainbow-sound',sound?'on':'off');}catch{}if(!sound&&'speechSynthesis'in window)window.speechSynthesis.cancel();updateHUD();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();return;}await document.documentElement.requestFullscreen();try{await window.screen.orientation?.lock('landscape');}catch{}}catch{toast('태블릿을 가로로 돌리면 더 넓게 보여요');}});
function canvasPoint(event){return normalizedPoint(canvas.getBoundingClientRect(),event.clientX,event.clientY);}
canvas.addEventListener('pointerdown',e=>{if(screenName!=='world'||busy||!$('overlay').hidden||festival)return;e.preventDefault();canvas.focus({preventScroll:true});const p=canvasPoint(e);if(p.x<0||p.y<0||p.x>1||p.y>1)return;const target=entityAt(region,state,p.x,p.y);walkTo(target?.x??p.x,target?.y??p.y,target?()=>interact(target):null);});
document.addEventListener('keydown',e=>{
  if(!$('overlay').hidden){if(e.key==='Escape'){e.preventDefault();closeModal();}if(e.key==='Tab'){const focusable=Array.from($('modal').querySelectorAll('button:not(:disabled)'));const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('modal'))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
  if(screenName!=='world'||busy||e.target.tagName==='BUTTON')return;
  const map={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  if(map[e.key]){e.preventDefault();path=[];arrival=null;marker=null;keys.add(map[e.key]);}
  if(e.key===' '||e.key==='Enter'){e.preventDefault();$('action-button').click();}
});
document.addEventListener('keyup',e=>{const map={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};keys.delete(map[e.key]);});
window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden&&'speechSynthesis'in window)window.speechSynthesis.cancel();});
function animate(timestamp){
  const time=timestamp/1000,dt=Math.min((timestamp-lastTime)/1000,.045)||0;lastTime=timestamp;
  if(screenName==='world'){
    player.moving=false;
    if(!busy&&$('overlay').hidden&&!festival){
      let dx=0,dy=0;
      if(keys.size){dx=(keys.has('right')?1:0)-(keys.has('left')?1:0);dy=(keys.has('down')?1:0)-(keys.has('up')?1:0);}
      else if(path.length){if(advancePath(player,path,dt)){const callback=arrival;arrival=null;marker=null;callback?.();}}
      if(dx||dy){const length=Math.hypot(dx,dy),speed=180*dt;dx=dx/length*speed;dy=dy/length*speed;const nx=player.x+dx/1536,ny=player.y+dy/1024;
        if(!keys.size||walkable(region,nx,ny)){player.x=nx;player.y=ny;player.moving=true;}else if(walkable(region,nx,player.y)){player.x=nx;player.moving=true;}else if(walkable(region,player.x,ny)){player.y=ny;player.moving=true;}
        player.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?2:3):(dy<0?1:0);
      }
    }
    drawScene(ctx,bank,{state,region,player,marker,festival,celebrate},reduced?0:time);
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);boot();
