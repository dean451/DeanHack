import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NAMES=['plains centaur','forest centaur','mountain centaur'];
const at=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};

test('every centaur has a head, neck, tail, two arms and four legs as named joints',()=>{
 for(const name of NAMES){
  const a=createCreature({name,symbol:67,color:3}),j=a.joints;
  assert(j,name);
  assert.equal(j.head,a.head);assert.equal(j.neck0,a.head);assert.equal(a.tail.name,'tail');
  for(let i=0;i<5;i++)assert(j[`tail${i}`]?.isBone,`${name}: tail${i} is a bone`);
  for(const n of ['lfore','rfore','lleg0','rleg0','lleg1','rleg1']){
   assert(j[n],`${name} ${n}`);assert.equal(j[n].name,n);
   assert.equal(j[n].position.x<0,n[0]==='l','left is -x');
  }
  assert.equal(j.lleg0.position.z>0,true,'fore legs are +z');
  assert.equal(j.lleg1.position.z<0,true,'hind legs are -z');
  assert.equal(a.arms.length,2,'centaur-attack.js and fidget.js still find the arms');
 }
});

test('turning an arm, a leg, the tail or the head moves only what hangs past it',()=>{
 for(const name of NAMES){
  const a=createCreature({name,symbol:67,color:3}),j={...a.joints,tail0:a.tail};
  for(const key of ['lfore','rfore','lleg0','rleg1','tail0','head']){
   const others=['lfore','rfore','lleg0','rleg1','tail0','head'].filter(k=>k!==key&&!(key==='head'&&k==='head'));
   const before=others.map(k=>tip(j[k]));
   j[key].rotation.x=.6;
   const moved=others.map(k=>tip(j[k]));
   j[key].rotation.x=0;
   // the arms hang from the body, not the head; nothing here is a child of another listed joint
   others.forEach((k,i)=>assert(moved[i].distanceTo(before[i])<1e-6,`${name}: turning ${key} moved ${k}`));
  }
  const hand=at(a.weaponSocket);j.rfore.rotation.x=.6;
  assert(at(a.weaponSocket).distanceTo(hand)>.01,`${name}: the weapon arm carries its hand`);
 }
});

// A part's world-space extent with its skin applied (Box3.setFromObject does not follow a skin's bones).
const V=new THREE.Vector3();
function skinBox(a,part){
 a.g.updateMatrixWorld(true);const box=new THREE.Box3();
 part.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 part.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;
  for(let i=0;i<p.count;i++){if(o.isSkinnedMesh)o.getVertexPosition(i,V);else V.fromBufferAttribute(p,i);box.expandByPoint(V.applyMatrix4(o.matrixWorld));}});
 return box;
}
const meshesOf=part=>{const m=[];part.traverse(o=>{if(o.isMesh)m.push(o);});return m;};

test('each centaur leg hangs on three bones, hip, knee and fetlock, and keeps its hoof on the floor',()=>{
 for(const name of NAMES){
  const a=createCreature({name,symbol:67,color:3}),j=a.joints;
  for(const leg of a.legs){
   for(const k of [0,1,2])assert(j[`${leg.name}_${k}`]?.isBone,`${name}: ${leg.name}_${k}`);
   const parts=meshesOf(leg);
   assert(parts.length>=3&&parts.every(m=>m.isSkinnedMesh),`${name}: ${leg.name} is skinned`);
   const box=skinBox(a,leg);
   assert(Math.abs(box.min.y)<.01,`${name}: ${leg.name} stands on the floor, not ${box.min.y}`);
   assert(box.max.y-box.min.y>.5*leg.position.y*a.g.scale.y,`${name}: ${leg.name} keeps its full length`);
  }
  // a knee turn swings the hoof and leaves the thigh and the other legs
  const leg=j.lleg0,before=skinBox(a,leg),others=a.legs.filter(l=>l!==leg).map(l=>skinBox(a,l).min);
  j.lleg0_1.rotation.x=.6;
  const after=skinBox(a,leg);
  assert(Math.abs(after.max.y-before.max.y)<1e-6,`${name}: the thigh stayed`);
  assert(Math.abs(after.min.y-before.min.y)>.03||Math.abs(after.min.z-before.min.z)>.03,`${name}: the hoof swung`);
  a.legs.filter(l=>l!==leg).forEach((l,i)=>assert(skinBox(a,l).min.distanceTo(others[i])<1e-9,`${name}: other legs stayed`));
 }
});

test('the centaur tail hangs on five bones; a bend carries the hair past it and leaves the dock, legs and man',()=>{
 for(const name of NAMES){
  const a=createCreature({name,symbol:67,color:3}),j=a.joints,meshes=meshesOf(a.tail);
  assert.equal(meshes.length,2,`${name}: dock and hair`);
  assert(meshes.every(m=>m.isSkinnedMesh),`${name}: the tail is skinned`);
  const rest=skinBox(a,a.tail),legs=a.legs.map(l=>skinBox(a,l).min),head=skinBox(a,a.head).max;
  j.tail2.rotation.x=.7;
  const bent=skinBox(a,a.tail);
  assert(Math.abs(bent.min.z-rest.min.z)>.03||Math.abs(bent.min.y-rest.min.y)>.03,`${name}: the tip swung`);
  assert(Math.abs(bent.max.y-rest.max.y)<1e-6,`${name}: the dock stayed`);
  a.legs.forEach((l,i)=>assert(skinBox(a,l).min.distanceTo(legs[i])<1e-9,`${name}: legs stayed`));
  assert(skinBox(a,a.head).max.distanceTo(head)<1e-9,`${name}: the man stayed`);
 }
});
