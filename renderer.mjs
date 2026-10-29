import {ASSETS} from './asset-data.mjs';
import {COLORS,LOCATIONS} from './core.mjs';
export {ASSETS};
export const GATES=[{x:.22,y:.48},{x:.32,y:.41},{x:.66,y:.40},{x:.80,y:.51},{x:.84,y:.66},{x:.68,y:.78},{x:.29,y:.78}];
export class AssetBank {
  constructor(){this.images=new Map();this.pending=new Map();}
  load(id){
    if(this.images.has(id))return Promise.resolve(this.images.get(id));
    if(this.pending.has(id))return this.pending.get(id);
    const a=ASSETS[id];if(!a)return Promise.reject(new Error('Unknown image '+id));
    const p=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{this.images.set(id,image);resolve(image);};image.onerror=()=>{this.pending.delete(id);reject(new Error('Image could not load: '+a.file));};image.src=new URL(a.file,import.meta.url).href;});
    this.pending.set(id,p);return p;
  }
}
export function sprite(ctx,bank,id,index,x,y,height,options={}) {
  const image=bank.images.get(id),asset=ASSETS[id],frame=asset?.frames?.[index];if(!image||!frame)return;
  const [sx,sy,sw,sh]=frame.sourceRect;
  const reference=options.referenceHeight||sh;
  const dh=height*sh/reference,dw=height*sw/reference;
  ctx.save();if(options.alpha!==undefined)ctx.globalAlpha=options.alpha;
  ctx.drawImage(image,sx,sy,sw,sh,x-dw*(options.anchorX??.5),y-dh*(options.anchorY??1),dw,dh);ctx.restore();
}
export function fitSprite(ctx,bank,id,index,width,height){
  ctx.clearRect(0,0,width,height);const f=ASSETS[id]?.frames?.[index];if(!f)return;
  const [, ,sw,sh]=f.sourceRect,scale=Math.min(width*.90/sw,height*.84/sh);
  sprite(ctx,bank,id,index,width/2,height/2,sh*scale,{anchorY:.5});
}
function pill(ctx,text,x,y,color='#fffdf0',size=20){
  ctx.font=`800 ${size}px "Malgun Gothic",sans-serif`;const w=ctx.measureText(text).width+34;
  ctx.fillStyle='#4f3c2c16';ctx.beginPath();ctx.roundRect(x-w/2,y-20,w,42,15);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-w/2,y-24,w,42,15);ctx.fill();ctx.fillStyle='#62533b';ctx.textAlign='center';ctx.fillText(text,x,y+4);
}
export function sceneEntities(region,state){
  if(region==='hub')return [...GATES.map((p,index)=>({...p,type:'gate',index,radius:78})),...(state.collected.length===7?[{x:.5,y:.65,type:'tree',radius:85}]:[]),{x:.37,y:.73,type:'guide',radius:78}];
  const index=LOCATIONS.findIndex(l=>l.id===region),l=LOCATIONS[index];
  return [{x:l.spot[0],y:l.spot[1],type:'friend',index,radius:72}];
}
export function entityAt(region,state,x,y){
  return sceneEntities(region,state).find(e=>{
    if(e.type==='friend'||e.type==='guide')return Math.abs((e.x-x)*1536)<115&&(y-e.y)*1024>-190&&(y-e.y)*1024<70;
    if(e.type==='tree')return x>.36&&x<.64&&y>.34&&y<.67;
    return Math.hypot((e.x-x)*1536,(e.y-y)*1024)<e.radius;
  })||null;
}
export function drawScene(ctx,bank,view,time=0) {
  const {state,region,player,festival=false}=view,w=1536,h=1024;
  ctx.clearRect(0,0,w,h);
  const index=LOCATIONS.findIndex(l=>l.id===region),l=LOCATIONS[index];
  const background=festival?'20-festival-ending':region==='hub'?'background-hub':l.asset;
  const bg=bank.images.get(background);
  ctx.save();
  if(!festival){const saturation=region==='hub'?.20+state.collected.length*.114:state.collected.includes(index)?1:.28;ctx.filter=`saturate(${saturation})`;}
  if(bg)ctx.drawImage(bg,0,0,w,h);else{ctx.fillStyle='#edf1df';ctx.fillRect(0,0,w,h);}ctx.restore();
  if(festival){
    const positions=[[.34,.67],[.66,.67],[.39,.73],[.61,.73],[.34,.79],[.66,.79],[.44,.80],[.56,.80],[.50,.68]];
    positions.forEach(([x,y],i)=>sprite(ctx,bank,'02-friends',i,x*w,(y+Math.sin(time*3+i)*.002)*h,i<2?70:95));
  }else if(region==='hub'){
    GATES.forEach((p,i)=>{
      const x=p.x*w,y=p.y*h;
      ctx.fillStyle='#fffdf0ed';ctx.strokeStyle=state.collected.includes(i)?'#69a788':COLORS[i];ctx.lineWidth=6;ctx.beginPath();ctx.arc(x,y-25,49,0,Math.PI*2);ctx.fill();ctx.stroke();
      sprite(ctx,bank,'01-rainbow-orbs',i,x,y+13,67);
      pill(ctx,(state.collected.includes(i)?'✓ ':'')+LOCATIONS[i].name,x,y+67,'#fffdf0',22);
    });
    sprite(ctx,bank,'02-friends',0,.37*w,(.73+Math.sin(time*2)*.003)*h,90);
    pill(ctx,'몽실',.37*w,.73*h+30,'#fffdf0',18);
    const sockets=[[.409,.473],[.435,.507],[.466,.523],[.500,.527],[.536,.522],[.568,.509],[.592,.475]];
    state.placed.forEach(i=>sprite(ctx,bank,'01-rainbow-orbs',i,sockets[i][0]*w,sockets[i][1]*h,38,{anchorY:.5}));
    if(state.collected.length===7)pill(ctx,'구슬을 돌려놓아요!',.5*w,.65*h,'#ffecad',23);
  }else{
    const done=state.collected.includes(index),P=l.props;
    if(region==='flower')[[.32,.58],[.50,.40],[.73,.58]].forEach(([x,y])=>sprite(ctx,bank,P,done?2:1,x*w,y*h,118));
    if(region==='orchard'){
      sprite(ctx,bank,P,done?3:2,.53*w,.55*h,100);
      if(!done)[[.24,.56],[.73,.56],[.39,.72]].forEach(([x,y],i)=>sprite(ctx,bank,P,i%2,x*w,y*h,55));
    }
    if(region==='hill')sprite(ctx,bank,P,done?1:0,.49*w,.30*h,200);
    if(region==='forest'){
      sprite(ctx,bank,P,done?1:0,.63*w,.51*h,88);
      if(!done)[[.51,.58,2],[.56,.62,3],[.70,.60,4],[.75,.65,5]].forEach(([x,y,f])=>sprite(ctx,bank,P,f,x*w,y*h,45));
    }
    if(region==='pond'&&!done)[[.52,.365,0],[.54,.410,1],[.55,.455,2]].forEach(([x,y,f])=>sprite(ctx,bank,P,f,x*w,y*h,65));
    if(region==='night')[[.38,.34],[.70,.36],[.26,.49],[.78,.59],[.38,.76],[.62,.79]].forEach(([x,y])=>sprite(ctx,bank,P,done?1:0,x*w,y*h,120));
    if(region==='castle')sprite(ctx,bank,P,done?1:0,.71*w,.59*h,140);
    sprite(ctx,bank,'02-friends',l.npc,l.spot[0]*w,l.spot[1]*h,112);
    pill(ctx,l.friend+(done?' ✓':''),l.spot[0]*w,l.spot[1]*h+31,'#fffdf0',21);
    if(!done){ctx.fillStyle='#f8ca5a';ctx.beginPath();ctx.arc(l.spot[0]*w+46,l.spot[1]*h-117,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='#70533b';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText('!',l.spot[0]*w+46,l.spot[1]*h-109);}
  }
  if(view.marker&&player.moving){ctx.strokeStyle='#fffbea';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(view.marker.x*w,view.marker.y*h,17,10,0,0,Math.PI*2);ctx.stroke();}
  const id=state.hero==='girl'?'18-hero-girl-transparent':'17-hero-boy-transparent';
  let row=player.moving?(player.direction??0):4;
  let frame=player.moving?Math.floor(time*9)%6:Math.floor(time*1.1)%6;
  if(view.celebrate){row=6;frame=Math.floor(time*6)%6;}
  const reference=ASSETS[id].frames[24].sourceRect[3];
  ctx.fillStyle='#6a58351b';ctx.beginPath();ctx.ellipse(player.x*w,player.y*h-1,24,8,0,0,Math.PI*2);ctx.fill();
  sprite(ctx,bank,id,row*6+frame,player.x*w,player.y*h,135,{referenceHeight:reference});
}
