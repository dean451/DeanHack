import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHobbit} from './hobbit.js';
import {createBugbear} from './bugbear.js';
import {DWARVES,createDwarf} from './dwarf.js';
import {MIND_FLAYER_KINDS,createMindFlayer} from './mind-flayer.js';
import {restPose, rests, REST} from './humanoid-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=[['hobbit',createHobbit],['bugbear',createBugbear],...DWARVES.map(n=>[n,()=>createDwarf(n)])];
const ROBED=Object.keys(MIND_FLAYER_KINDS).map(n=>[n,()=>createMindFlayer(n)]);
const make=([,build])=>{const a=build();a.g.updateMatrixWorld(true);return a;};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();
 a.g.traverse(m=>{if(!m.isSkinnedMesh)return;m.updateMatrixWorld(true);m.skeleton.update();const n=m.geometry.attributes.position.count;
  for(let i=0;i<n;i+=3){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}});return y;};

test('the hobbit, dwarves and bugbear sit; the robed mind flayers stay up; nothing else does',()=>{
 for(const f of FAMILY)assert(rests(make(f)),f[0]);
 for(const f of ROBED)assert(!rests(make(f)),f[0]);
 assert(!rests(null)&&!rests({joints:{}}));
});

test('the sit meets every goal under 2 cm on every member',()=>{
 for(const f of FAMILY){const r=restPose(make(f));
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${f[0]}: worst goal ${worst.toFixed(2)} cm`);}
});

test('sitting: pelvis on the floor, heels ahead of it, back stooped, head low, hands on the thighs, nothing through the floor',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),r=restPose(a),stood=P.mouth().y-floor;
  apply(r.pose);
  assert(P.rump().y-floor<=r.seat+.02,`${f[0]}: pelvis ${(P.rump().y-floor).toFixed(2)}`);
  for(const s of ['l','r']){
   assert(P[`paw:${s}h`]().y-floor<.02,`${f[0]}: heel on the floor`);
   assert(P[`paw:${s}h`]().z-P.rump().z>REST.legs*r.stand-.1,`${f[0]}: heel ahead of the pelvis`);
   assert(P[`paw:${s}f`]().y-floor<r.stand*.75,`${f[0]}: hand low ${(P[`paw:${s}f`]().y-floor).toFixed(2)} of ${r.stand.toFixed(2)}`);}
  assert(P.withers().z-P.rump().z>REST.stoop*r.stand-.08,`${f[0]}: stooped`);
  assert(P.mouth().y-floor<=REST.head*stood+.02,`${f[0]}: head low ${(P.mouth().y-floor).toFixed(2)} of ${stood.toFixed(2)}`);
  assert(lowest(a)>floor-.02,`${f[0]}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const f of FAMILY){const a=make(f),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${f[0]} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
