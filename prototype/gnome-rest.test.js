import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GNOMES,createGnome} from './gnome.js';
import {createGoblin} from './goblin.js';
import {restPose, rests} from './gnome-rest.js';
import {REST} from './humanoid-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 4 of the creature plan for gnomes (family G), step 1: the humanoid slump on every gnome.
const FAMILY=GNOMES.map(n=>[n,()=>createGnome(n)]);
const make=([,build])=>{const a=build();a.g.updateMatrixWorld(true);return a;};
// the lowest point of every mesh, skinned or not (cap, beard, cape, weapon), every vertex
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();a.g.updateMatrixWorld(true);
 a.g.traverse(m=>{if(!m.isMesh)return;if(m.isSkinnedMesh)m.skeleton.update();const p=m.geometry.attributes.position;
  for(let i=0;i<p.count;i++){(m.isSkinnedMesh?m.getVertexPosition(i,v):v.fromBufferAttribute(p,i)).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}});return y;};
const solved=new Map(),sit=f=>{if(!solved.has(f[0]))solved.set(f[0],restPose(make(f)));return solved.get(f[0]);};

test('every gnome sits; a goblin is not a gnome',()=>{
 for(const f of FAMILY)assert(rests(make(f)),f[0]);
 assert(!rests(createGoblin('goblin'))&&!rests(null));
});

test('the sit meets every goal under 2 cm on every gnome',()=>{
 for(const f of FAMILY){const worst=Math.max(...sit(f).residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${f[0]}: worst goal ${worst.toFixed(2)} cm`);}
});

test('sitting: pelvis down, heels ahead, back stooped, head hung, hands low',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,P=rolesOf(a),stood=P.mouth().y-floor,r=sit(f);
  birdPoser(a).apply(r.pose);
  assert(P.rump().y-floor<=r.seat+.02,`${f[0]}: pelvis ${(P.rump().y-floor).toFixed(2)}`);
  for(const s of ['l','r']){
   assert(P[`paw:${s}h`]().y-floor<.02,`${f[0]}: heel on the floor`);
   assert(P[`paw:${s}h`]().z-P.rump().z>REST.legs*r.stand-.1,`${f[0]}: heel ahead of the pelvis`);
   assert(P[`paw:${s}f`]().y-floor<r.stand*.75,`${f[0]}: hand low`);}
  assert(P.withers().z-P.rump().z>REST.stoop*r.stand-.08,`${f[0]}: stooped`);
  assert(P.mouth().y-floor<=REST.head*stood+.02,`${f[0]}: head low`);
  // the face tips down, not up: the mouth drops further under the head's middle than it does standing
  const face=()=>P.mouth().y-P.head().y;birdPoser(a).apply({});const up=face();birdPoser(a).apply(r.pose);
  assert(face()<up,`${f[0]}: face tipped down`);}
});

test('nothing goes deeper through the floor than the boots stand: every vertex of every mesh',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,standing=lowest(a);
  birdPoser(a).apply(sit(f).pose);
  const low=lowest(a);
  assert(low>Math.min(standing,floor)-.003,`${f[0]}: lowest ${((low-floor)*100).toFixed(1)} cm, standing ${((standing-floor)*100).toFixed(1)} cm`);}
});

test('the head, cap and beard stay above the hide, not sunk into the chest',()=>{
 for(const f of FAMILY){const a=make(f);birdPoser(a).apply(sit(f).pose);a.g.updateMatrixWorld(true);
  const P=rolesOf(a),hat=new THREE.Box3().setFromObject(a.hat,true);
  assert(hat.min.y>P.withers().y,`${f[0]}: cap above the withers`);
  assert(P.chin().y>P.rump().y,`${f[0]}: chin above the pelvis`);}
});

test('posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const f of FAMILY){const a=make(f),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${f[0]} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
