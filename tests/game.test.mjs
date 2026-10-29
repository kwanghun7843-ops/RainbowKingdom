import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LOCATIONS,newState,restoreState,collect,place,missionState,missionAction,findPath,walkable,advancePath,normalizedPoint} from '../core.mjs';
import {ASSETS,GATES,entityAt,fitSprite} from '../renderer.mjs';

function win(id){const m=missionState(id);
  if(id==='flower'){missionAction(m,'tool');for(let i=0;i<3;i++)missionAction(m,'flower',i);}
  if(id==='orchard')for(let i=0;i<3;i++)missionAction(m,'fruit',i);
  if(id==='hill')for(let i=0;i<3;i++){missionAction(m,'piece',i);missionAction(m,'slot',i);}
  if(id==='forest'){for(let i=0;i<4;i++)missionAction(m,'material',i);missionAction(m,'repair');}
  if(id==='pond')for(let i=0;i<3;i++)missionAction(m,'branch',i);
  if(id==='night')for(let i=0;i<6;i++)missionAction(m,'star',i);
  if(id==='castle')for(let i=0;i<3;i++)missionAction(m,'symbol',i);
  return m;
}
test('all seven missions lead to one collectible each and a complete festival',()=>{
  const state=newState('girl');LOCATIONS.forEach((l,i)=>{assert.equal(win(l.id).complete,true);assert.equal(collect(state,i),true);assert.equal(collect(state,i),false);});
  assert.equal(state.collected.length,7);assert.equal(state.finished,false);
  for(let i=0;i<7;i++){assert.equal(place(state,i),true);assert.equal(place(state,i),false);}
  assert.equal(state.finished,true);assert.deepEqual(restoreState(JSON.stringify(state)),state);
});
test('repeated taps and incorrect actions do not grant progress',()=>{
  const f=missionState('flower');assert.equal(missionAction(f,'flower',0).gentle,true);assert.equal(f.done.length,0);
  missionAction(f,'tool');missionAction(f,'flower',0);missionAction(f,'flower',0);assert.equal(f.done.length,1);
  const h=missionState('hill');missionAction(h,'piece',0);assert.equal(missionAction(h,'slot',1).gentle,true);assert.equal(h.done.length,0);missionAction(h,'slot',0);assert.equal(h.done.length,1);
  const nest=missionState('forest');assert.equal(missionAction(nest,'repair').gentle,true);assert.equal(nest.complete,false);
  const music=missionState('castle');assert.equal(missionAction(music,'symbol',2).gentle,true);assert.equal(music.step,0);
});
test('damaged or incompatible saves cannot finish the game or duplicate balls',()=>{
  assert.equal(restoreState('not json'),null);assert.equal(restoreState({version:2}),null);
  const s=restoreState({version:1,hero:'boy',collected:[0,0,1,-1,20,'3'],placed:[0,2],finished:true});assert.deepEqual(s.collected,[0,1]);assert.deepEqual(s.placed,[0]);assert.equal(s.finished,false);
  assert.equal(place(s,6),false);assert.equal(collect(s,99),false);
});
test('every region, friend and portal is reachable without walking into obstacles',()=>{
  const start={x:.5,y:.88};
  const routes=GATES.map(p=>['hub',p]).concat([['hub',{x:.5,y:.65}],['hub',{x:.37,y:.73}]],LOCATIONS.map(l=>[l.id,{x:l.spot[0],y:l.spot[1]}]));
  for(const [region,target] of routes){const path=findPath(region,start,target);assert.ok(path.length>0,region);for(const p of path)assert.equal(walkable(region,p.x,p.y),true,region);
    const player={...start,moving:false,direction:0};let steps=0;while(path.length&&steps++<6000)advancePath(player,path,.045);assert.equal(path.length,0,region+' movement must arrive at low frame rate');
  }
});
test('large friend targets respond and the tree activates only after all balls are found',()=>{
  const s=newState();assert.equal(entityAt('flower',s,.53,.50)?.type,'friend');assert.notEqual(entityAt('hub',s,.50,.45)?.type,'tree');
  for(let i=0;i<7;i++)collect(s,i);assert.equal(entityAt('hub',s,.50,.45)?.type,'tree');
});
test('stretched tablet canvas maps taps directly to visible positions',()=>{
  const rect={left:100,top:50,width:1000,height:400};assert.deepEqual(normalizedPoint(rect,600,250),{x:.5,y:.5});assert.deepEqual(normalizedPoint(rect,100,50),{x:0,y:0});
});
test('all asset files and sprite rectangles exist within PNG bounds',()=>{
  for(const a of Object.values(ASSETS)){assert.ok(fs.existsSync(new URL('../'+a.file,import.meta.url)),a.id);
    for(const f of a.frames||[]){const [x,y,w,h]=f.sourceRect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=a.width&&y+h<=a.height,a.id);}}
  assert.equal(Object.keys(ASSETS).length,21);
});
test('all activity pictures fit in their buttons without cropping wide objects',()=>{
  let draw;const ctx={clearRect(){},save(){},restore(){},drawImage(...args){draw=args;}};
  const bank={images:new Map(Object.keys(ASSETS).map(id=>[id,{}]))};
  for(const a of Object.values(ASSETS))for(const f of a.frames||[]){
    fitSprite(ctx,bank,a.id,f.index,210,210);const [x,y,w,h]=draw.slice(5);
    assert.ok(x>=0&&y>=0&&x+w<=210.001&&y+h<=210.001,a.id+' '+f.index);
  }
});
