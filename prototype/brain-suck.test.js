import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {suckMessage,suckShape,suckStyle,createBrainSuck,poseBrainSuck,DURATION,HEAD_Y,HEAD_R,REACH_MS,MOUTH_Y} from './brain-suck.js';

test('the engine messages for the brain attack are read, including the helmet and grease saves',()=>{
 assert.deepEqual(suckMessage("The mind flayer's tentacles suck you!"),{phase:'suck',name:'mind flayer'});
 assert.deepEqual(suckMessage("The master mind flayer's tentacles suck you!"),{phase:'suck',name:'master mind flayer'});
 assert.equal(suckMessage('Your brain is eaten!').outcome,'eaten');
 assert.equal(suckMessage('Your helmet blocks the attack to your head.').outcome,'helmet');
 assert.equal(suckMessage('Your hat blocks the attack to your head.').outcome,'helmet');
 assert.equal(suckMessage('The mind flayer grabs you, but cannot hold onto your greased dented pot!').outcome,'grease');
 assert.equal(suckMessage("You don't seem harmed.").outcome,'harmless');
 assert(suckMessage('The grease wears off.').greaseOff);
 assert.equal(suckMessage('The mind flayer misses!'),null);
});

const at={hero:{x:5,z:5},flayer:{x:6,z:5}};
const tipsNearHead=sh=>{let far=0;for(let i=0;i<4;i++){const b=sh.beads[i*18+17];far=Math.max(far,Math.hypot(b.x-5,b.y-HEAD_Y,b.z-5));}return far;};
test('each outcome is finite, reaches (or misses) the face as it should, and ends',()=>{
 for(const outcome of Object.keys(DURATION)){
  let sparks=0,grease=0,maxShake=0;
  for(let t=0;t<DURATION[outcome];t+=8){
   const sh=suckShape({...at,outcome},t);assert(sh,`${outcome} ended early at ${t}`);
   for(const b of sh.beads)for(const v of [b.x,b.y,b.z,b.r])assert(Number.isFinite(v));
   for(const b of sh.beads)assert(b.r>0&&b.r<.06&&b.y>.5&&b.y<1.9,`${outcome} bead ${JSON.stringify(b)}`);
   for(const p of sh.particles){assert(Number.isFinite(p.x+p.y+p.z+p.alpha));if(p.kind==='spark')sparks++;else grease++;}
   maxShake=Math.max(maxShake,Math.abs(sh.shake));
   if(outcome==='miss')assert(tipsNearHead(sh)>HEAD_R+.05,'a miss must not touch the face');
  }
  assert.equal(suckShape({...at,outcome},DURATION[outcome]),null);
  if(outcome!=='miss')assert(tipsNearHead(suckShape({...at,outcome},REACH_MS+20))<HEAD_R+.06,`${outcome} should reach the face`);
  assert.equal(sparks>0,outcome==='helmet');assert.equal(grease>0,outcome==='grease');assert.equal(maxShake>.3,outcome==='eaten');
  assert(Math.abs(suckShape({...at,outcome},DURATION[outcome]-1).shake)<.05);
 }
 // The tentacles come out of the flayer's side, not the hero's back.
 const b0=suckShape({...at,outcome:'eaten'},REACH_MS).beads[0];assert(b0.x>5.7,`root at ${b0.x}`);
});

test('the tracker pairs messages with the combat event, queues a master flayer\'s attacks and clears',()=>{
 const parent=new THREE.Group(),s=createBrainSuck(THREE,parent),frame={player:{x:5,z:5}};
 const hit={attack:'tentacle',result:'hit',heroDefends:true,attacker:{x:6,z:4,seen:true,name:'master mind flayer'},defender:{you:true,x:5,z:5}};
 s.combat(hit);s.message("The master mind flayer's tentacles suck you!",frame);s.message('Your helmet blocks the attack to your head.',frame);
 s.combat(hit);s.message("The master mind flayer's tentacles suck you!",frame);s.message('The master mind flayer grabs you, but cannot hold onto your greased helmet!',frame);
 s.combat(hit);s.message("The master mind flayer's tentacles suck you!",frame);s.message('Your brain is eaten!',frame);
 s.combat({...hit,result:'miss'});
 assert.deepEqual(s.queue.map(a=>a.outcome),['helmet','grease','eaten','miss']);
 const seen=[];let r;
 for(let i=0;i<400;i++){r=s.update(1/60,{x:0,z:0});if(r.outcome&&seen.at(-1)!==r.outcome)seen.push(r.outcome);}
 assert.deepEqual(seen,['helmet','grease','eaten','miss']);
 assert.equal(r.active,false);
 assert(s.current===null||!s.update(0).active);
 s.message("The mind flayer's tentacles suck you!",frame);s.clear();assert.equal(s.queue.length,0);assert.equal(s.update(.1).beads,0);
 s.dispose();assert.equal(parent.children.length,0);
});

test('the hero\'s head jerk is an offset that comes back to rest',()=>{
 const head=new THREE.Group();head.rotation.set(.1,.2,.3);const hero={head};
 for(let t=0;t<2;t+=1/60)poseBrainSuck(hero,Math.sin(t*9));
 poseBrainSuck(hero,0);
 assert(Math.abs(head.rotation.x-.1)<1e-9&&Math.abs(head.rotation.z-.3)<1e-9);
});

test('Cthulhu\'s tentacles are its own: green, thick, from its high maw, with pale suckers',()=>{
 assert.deepEqual(suckMessage("Cthulhu's tentacles suck you!"),{phase:'suck',name:'Cthulhu'});
 const c=suckStyle('Cthulhu'),f=suckStyle('mind flayer');
 assert.equal(f.tint,0xa07aa8);assert.equal(suckStyle('master mind flayer').tint,0xb088c0);assert.equal(suckStyle(null),f);
 assert.notEqual(c.tint,f.tint);assert(c.mouthY>MOUTH_Y+.3&&c.girth>1);
 for(const outcome of Object.keys(DURATION)){
  for(let t=0;t<DURATION[outcome];t+=8){
   const sh=suckShape({...at,...c,outcome},t);
   for(const b of sh.beads)assert(Number.isFinite(b.x+b.y+b.z+b.r)&&b.r>0&&b.r<.09&&b.y>.5&&b.y<2.1,`${outcome} bead ${JSON.stringify(b)}`);
   if(outcome==='miss')assert(tipsNearHead(sh)>HEAD_R+.05);
  }
  if(outcome!=='miss')assert(tipsNearHead(suckShape({...at,...c,outcome},REACH_MS+20))<HEAD_R+.06,`${outcome} should reach the face`);
 }
 // The roots leave the maw: high up and well out of Cthulhu's side of the gap.
 const r=suckShape({...at,...c,outcome:'eaten'},REACH_MS).beads[0];
 assert(Math.abs(r.y-c.mouthY)<1e-9&&Math.abs(r.x-(6-c.mouthForward))<1e-9,`root ${JSON.stringify(r)}`);
 assert(r.r>suckShape({...at,outcome:'eaten'},REACH_MS).beads[0].r*1.4);
 // The tracker takes the style from the name, and paints the suckers pale.
 const parent=new THREE.Group(),s=createBrainSuck(THREE,parent),frame={player:{x:5,z:5}};
 s.combat({attack:'tentacle',result:'hit',heroDefends:true,attacker:{x:6,z:5,name:'Cthulhu'},defender:{you:true,x:5,z:5}});
 s.message("Cthulhu's tentacles suck you!",frame);s.message('Your brain is eaten!',frame);
 assert.equal(s.queue[0].mouthY,c.mouthY);
 for(let i=0;i<20;i++)s.update(1/60,{x:0,z:0});
 const mesh=parent.children.find(o=>o.isInstancedMesh),col=new THREE.Color();
 mesh.getColorAt(0,col);const pale=col.getHex();mesh.getColorAt(1,col);
 assert(new THREE.Color(pale).r>.5&&col.g>col.r&&col.g>col.b,`sucker ${pale.toString(16)} skin ${col.getHexString()}`);
 s.dispose();
});

test('an eaten brain ends on one last gulp down the tentacles; a harmless wrap does not',()=>{
 const base={hero:{x:5,z:5},flayer:{x:6,z:5}},letGo=DURATION.eaten-420,heat=(o,t)=>Math.max(...suckShape({...base,outcome:o},t).beads.map(b=>b.heat));
 assert(heat('eaten',letGo+100)>.2);
 assert.equal(heat('eaten',letGo+300),0);
 assert.equal(heat('eaten',DURATION.eaten-1),0);
 assert.equal(heat('harmless',DURATION.harmless-300),0);
 assert.equal(suckShape({...base,outcome:'eaten'},DURATION.eaten),null);
});
