import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {suckMessage,suckShape,createBrainSuck,poseBrainSuck,DURATION,HEAD_Y,HEAD_R,REACH_MS} from './brain-suck.js';

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
