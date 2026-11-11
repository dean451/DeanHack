import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {washPose, washPoser, washes, WASH} from './rat-wash.js';
import {rolesOf} from './body-roles.js';

// Stage 4 of the creature plan for the rats (family r), step 2: the signature behaviour's pose, the face wash.
const FAMILY=['enormous rat','giant rat','rabid rat','sewer rat'];
const make=name=>{const a=createCreature({name,symbol:114,color:7});a.g.updateMatrixWorld(true);return a;};
const lowest=a=>{let y=Infinity;const b=new THREE.Box3();a.g.updateMatrixWorld(true);
 a.g.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){b.setFromObject(o,true);y=Math.min(y,b.min.y);}});
 a.g.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const v=new THREE.Vector3(),n=o.geometry.attributes.position.count;
  for(let i=0;i<n;i+=3){o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);y=Math.min(y,v.y);}}});return y;};
// (the roles are read before posing: a paw is the sole of the standing leg, carried on its bone)
const solved=new Map();
const washer=name=>{if(!solved.has(name)){const a=make(name),P=rolesOf(a),stand={withers:P.withers().y,mouth:P.mouth().clone()},r=washPose(a);solved.set(name,{a,P,r,stand});}return solved.get(name);};

test('the four rats wash this way; nothing else does',()=>{
 for(const n of FAMILY)assert(washes(make(n)),n);
 for(const n of ['rothe','newt','jackal'])assert(!washes(createCreature({name:n,symbol:113,color:7})),n);
 assert(!washes(null));
});

test('the wash meets every goal under 2 cm on all four',()=>{
 for(const n of FAMILY){const {r}=washer(n),worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${n}: worst goal ${worst.toFixed(2)} cm`);}
});

test('sat up: the trunk reared and tall, hind feet on the floor, forepaws off it at the nose, tail behind, nothing through the floor',()=>{
 for(const n of FAMILY){const {a,P,r,stand}=washer(n),floor=a.g.position.y,{apply}=washPoser(a);
  apply(r.pose);
  const up=P.withers().y-floor;
  assert(up>=WASH.up*r.high-.02,`${n}: withers ${(up/r.high).toFixed(2)} of the shoulder height`);
  assert(up>1.6*(stand.withers-floor),`${n}: far taller than standing`);
  const w=P.withers(),b=P.rump(),slope=Math.atan2(w.y-b.y,Math.hypot(w.x-b.x,w.z-b.z))*180/Math.PI;
  assert(Math.abs(slope-WASH.rise)<=WASH.slack+3,`${n}: trunk at ${slope.toFixed(0)} degrees`);
  for(const s of ['l','r']){
   assert(Math.abs(P[`paw:${s}h`]().y-floor)<.02,`${n}: ${s} hind foot on the floor`);
   assert(P[`paw:${s}f`]().y-floor>=WASH.lift*r.high-.02,`${n}: ${s} forepaw lifted`);
   assert(P[`paw:${s}f`]().distanceTo(P.mouth())<=WASH.paw*r.high+.02,`${n}: ${s} forepaw at the nose`);}
  assert(P.mouth().y>stand.mouth.y,`${n}: the nose raised off the floor`);
  assert(P.tailtip().z<P.rump().z+.01,`${n}: tail tip behind the rump`);
  assert(lowest(a)>floor-.02,`${n}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);
  apply({});}
});

test('the pose is easy to leave: posing nothing returns every joint, the body and its pitch exactly to the built values',()=>{
 for(const n of FAMILY){const a=make(n),built={};
  for(const [k,o] of Object.entries(a.joints))built[k]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray(),pitch=a.body.rotation.toArray().slice(0,3);
  // (solving leaves the built pose as it found it; one fresh solve is enough to show it, the others are cached)
  if(n==='sewer rat'){washPose(a);
   for(const [k,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[k],`${n} ${k}`);
   assert.deepEqual(a.body.position.toArray(),body);assert.deepEqual(a.body.rotation.toArray().slice(0,3),pitch);}
  const {apply}=washPoser(a);apply(washer(n).r.pose);apply({});
  for(const [k,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[k],`${n} ${k} after a pose`);
  assert.deepEqual(a.body.position.toArray(),body);assert.deepEqual(a.body.rotation.toArray().slice(0,3),pitch);}
});
