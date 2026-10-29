export const COLORS = ['#ef5659','#f39b35','#f2c941','#78ba69','#4daade','#666ccc','#ae7bd5'];
export const NAMES = ['빨강','주황','노랑','초록','파랑','남색','보라'];
export const LOCATIONS = [
  {id:'flower',name:'꽃밭',friend:'토리',npc:2,asset:'10-flower-clean',props:'03-flower-props',verb:'꽃에 물을 주어요',intro:'꽃이 아직 오므라들었어. 물뿌리개로 꽃에 물을 주면 활짝 필 거야!',thanks:'꽃들이 활짝 피었어! 꽃 속에 빨강 구슬이 있었구나!',icon:'🌷',spot:[.48,.62]},
  {id:'orchard',name:'과일 정원',friend:'다람',npc:3,asset:'11-orchard-clean',props:'04-orchard-props',verb:'과일을 바구니에 담아요',intro:'바람에 과일이 여기저기 굴러갔어. 과일을 찾아 바구니에 담아 줄래?',thanks:'과일을 모두 찾았어! 바구니 옆에서 주황 구슬도 찾았네!',icon:'🍊',spot:[.53,.64]},
  {id:'hill',name:'햇살 언덕',friend:'삐약',npc:4,asset:'12-hill-clean',props:'05-sun-props',verb:'해님 그림을 맞추어요',intro:'해님 그림 조각이 흩어졌어. 같은 모양의 자리에 조각을 놓아 줄래?',thanks:'해님 그림이 완성됐어! 그림 뒤에 노랑 구슬이 있었구나!',icon:'☀️',spot:[.51,.44]},
  {id:'forest',name:'숲속 마을',friend:'짹짹',npc:5,asset:'13-forest-clean',props:'06-forest-props',verb:'새 둥지를 고쳐요',intro:'내 둥지가 헐거워졌어. 가지와 잎을 모아 포근한 둥지를 만들어 줄래?',thanks:'둥지가 포근해졌어! 나뭇잎 사이에서 초록 구슬이 반짝여!',icon:'🍃',spot:[.57,.67]},
  {id:'pond',name:'연못',friend:'찰랑',npc:6,asset:'14-pond-clean',props:'07-pond-props',verb:'막힌 물길을 열어요',intro:'나뭇가지가 물길을 막았어. 가지를 옆으로 옮기면 물이 다시 흐를 거야!',thanks:'물이 졸졸 흐른다! 물결 위로 파랑 구슬이 떠올랐어!',icon:'💧',spot:[.40,.64]},
  {id:'night',name:'밤하늘 길',friend:'부우',npc:7,asset:'15-night-clean',props:'08-star-props',verb:'별등을 켜요',intro:'축제 길을 밝혀 줄 별등을 깨워 줄래? 별을 톡 누르면 환하게 켜질 거야.',thanks:'별등이 모두 켜졌어! 마지막 별등에서 남색 구슬을 찾았구나!',icon:'⭐',spot:[.52,.68]},
  {id:'castle',name:'꿈의 성',friend:'코코',npc:8,asset:'16-castle-clean',props:'09-music-props',verb:'오르골을 열어요',intro:'오르골에 그려진 그림과 같은 버튼을 눌러 줘. 안에서 반짝이는 소리가 나!',thanks:'오르골이 다시 노래해! 안에 보라 구슬이 들어 있었구나!',icon:'🎵',spot:[.57,.68]}
];

export function newState(hero='boy') { return {version:1,hero:hero==='girl'?'girl':'boy',collected:[],placed:[],finished:false}; }
export function restoreState(raw) {
  try {
    const d=typeof raw==='string'?JSON.parse(raw):raw;
    if (!d || d.version!==1 || !['boy','girl'].includes(d.hero)) return null;
    const valid=a=>[...new Set((Array.isArray(a)?a:[]).filter(x=>Number.isInteger(x)&&x>=0&&x<7))].sort((a,b)=>a-b);
    const collected=valid(d.collected), placed=valid(d.placed).filter(x=>collected.includes(x));
    return {version:1,hero:d.hero,collected,placed,finished:Boolean(d.finished&&placed.length===7)};
  } catch { return null; }
}
export function collect(state,index) {
  if (!Number.isInteger(index)||index<0||index>=7||state.collected.includes(index)) return false;
  state.collected.push(index); state.collected.sort((a,b)=>a-b); return true;
}
export function place(state,index) {
  if (!state.collected.includes(index)||state.placed.includes(index)) return false;
  state.placed.push(index); state.finished=state.placed.length===7; return true;
}
export function missionState(id) {
  return {id,done:[],selected:null,step:0,complete:false};
}
export function missionAction(m,action,value) {
  if(m.complete) return {changed:false,complete:true};
  let changed=false, gentle=false;
  const mark=(n,max)=>{if(Number.isInteger(n)&&n>=0&&n<max&&!m.done.includes(n)){m.done.push(n);changed=true;}};
  if(m.id==='flower') {
    if(action==='tool'){m.selected='water';changed=true;}
    if(action==='flower'){if(m.selected==='water')mark(value,3);else gentle=true;}
    m.complete=m.done.length===3;
  } else if(m.id==='orchard') {if(action==='fruit')mark(value,3);m.complete=m.done.length===3;}
  else if(m.id==='hill') {
    if(action==='piece'&&[0,1,2].includes(value)&&!m.done.includes(value)){m.selected=value;changed=true;}
    if(action==='slot'){if(value===m.selected){mark(value,3);m.selected=null;}else gentle=true;}
    m.complete=m.done.length===3;
  } else if(m.id==='forest') {
    if(action==='material')mark(value,4);
    if(action==='repair'){if(m.done.length===4){m.complete=true;changed=true;}else gentle=true;}
  } else if(m.id==='pond') {if(action==='branch')mark(value,3);m.complete=m.done.length===3;}
  else if(m.id==='night') {if(action==='star')mark(value,6);m.complete=m.done.length===6;}
  else if(m.id==='castle'&&action==='symbol') {
    if(value===m.step){m.step++;changed=true;m.complete=m.step===3;}else gentle=true;
  }
  return {changed,gentle,complete:m.complete};
}

const poly={
  hub:[[.20,.42],[.42,.35],[.59,.35],[.82,.42],[.90,.63],[.75,.83],[.60,.97],[.40,.97],[.24,.83],[.10,.64]],
  flower:[[.22,.29],[.78,.28],[.91,.64],[.70,.83],[.57,.98],[.41,.98],[.27,.77],[.10,.61]],
  orchard:[[.20,.32],[.69,.32],[.84,.45],[.78,.73],[.62,.83],[.56,.98],[.43,.98],[.33,.79],[.15,.62]],
  hill:[[.35,.32],[.73,.32],[.76,.45],[.63,.63],[.58,.98],[.43,.98],[.35,.65],[.24,.45]],
  forest:[[.21,.31],[.49,.31],[.61,.41],[.73,.57],[.75,.73],[.58,.84],[.58,.98],[.43,.98],[.32,.81],[.21,.64]],
  pond:[[.15,.35],[.31,.30],[.38,.46],[.43,.54],[.62,.68],[.63,.79],[.56,.98],[.44,.98],[.32,.81],[.18,.65]],
  night:[[.30,.27],[.70,.27],[.83,.56],[.70,.78],[.59,.98],[.41,.98],[.28,.80],[.16,.55]],
  castle:[[.29,.40],[.72,.40],[.84,.63],[.65,.80],[.58,.98],[.41,.98],[.27,.79],[.16,.63]]
};
const obstacles={hub:[[.36,.34,.64,.60]],flower:[[.34,.27,.67,.45],[.18,.43,.41,.68],[.59,.43,.84,.67]],orchard:[[.41,.39,.59,.56]],hill:[[.39,.25,.56,.35],[.56,.29,.73,.40]],forest:[[.56,.38,.79,.58]],pond:[],night:[[.35,.37,.63,.63]],castle:[[.63,.44,.82,.65]]};
export function pointInPolygon(x,y,vertices) {
  let inside=false;
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++) {
    const [xi,yi]=vertices[i],[xj,yj]=vertices[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
export function normalizedPoint(rect,clientX,clientY) {
  if(!rect||rect.width<=0||rect.height<=0)return {x:-1,y:-1};
  return {x:(clientX-rect.left)/rect.width,y:(clientY-rect.top)/rect.height};
}
export function walkable(region,x,y) {return pointInPolygon(x,y,poly[region]||poly.hub)&&!(obstacles[region]||[]).some(([l,t,r,b])=>x>l&&x<r&&y>t&&y<b);}
export function findPath(region,start,target) {
  const cols=40,rows=28, nodes=[];
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(walkable(region,(x+.5)/cols,(y+.5)/rows))nodes.push({x,y,key:y*cols+x});
  if(!nodes.length)return [];
  const nearest=p=>nodes.reduce((a,b)=>Math.hypot((b.x+.5)/cols-p.x,(b.y+.5)/rows-p.y)<Math.hypot((a.x+.5)/cols-p.x,(a.y+.5)/rows-p.y)?b:a);
  const from=nearest(start),to=nearest(target),valid=new Set(nodes.map(n=>n.key)),previous=new Map([[from.key,null]]),queue=[from.key];
  for(let i=0;i<queue.length;i++){
    const k=queue[i];if(k===to.key)break;
    const x=k%cols,y=Math.floor(k/cols);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx=x+dx,ny=y+dy,nk=ny*cols+nx;
      if(nx<0||nx>=cols||ny<0||ny>=rows||!valid.has(nk)||previous.has(nk))continue;
      if(dx&&dy&&(!valid.has(y*cols+nx)||!valid.has(ny*cols+x)))continue;
      previous.set(nk,k);queue.push(nk);
    }
  }
  if(!previous.has(to.key))return [];
  const path=[];for(let k=to.key;k!==null;k=previous.get(k))path.push({x:(k%cols+.5)/cols,y:(Math.floor(k/cols)+.5)/rows});
  return path.reverse();
}

export function advancePath(player,path,dt,speed=180){
  player.moving=false;if(!path.length)return false;
  const next=path[0],dx=(next.x-player.x)*1536,dy=(next.y-player.y)*1024,d=Math.hypot(dx,dy),step=speed*Math.max(0,dt);
  if(d<=Math.max(step,2)){player.x=next.x;player.y=next.y;path.shift();}
  else{player.x+=dx/d*step/1536;player.y+=dy/d*step/1024;}
  if(d>2){player.moving=true;player.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?2:3):(dy<0?1:0);}
  return path.length===0;
}
