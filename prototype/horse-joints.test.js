import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=['pony','horse','white unicorn','gray unicorn','black unicorn'];
const make=name=>createCreature({name,symbol:'u'.charCodeAt(0),color:7});
const tip=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o).max.clone();};

test('every horse and unicorn has head, neck, tail and its four legs as named joints',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert(a.head,`${name}: head`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.tail0,a.tail,`${name}: tail0`);
  for(const side of ['l','r'])for(const k of [0,1]){
   const leg=j[`${side}leg${k}`];
   assert(leg&&a.legs.includes(leg),`${name}: ${side}leg${k}`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   assert.equal(leg.position.z>0,k===0,`${name}: fore is +z`);
  }
 }
});

test('turning the tail, a hip or the head moves only what hangs on it',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  const legsBefore=a.legs.map(tip),tailBefore=tip(a.tail);
  j.rleg1.rotation.x=.5;
  assert(tip(j.rleg1).distanceTo(legsBefore[a.legs.indexOf(j.rleg1)])>.005,`${name}: the leg swung`);
  a.legs.forEach((l,i)=>{if(l!==j.rleg1)assert(tip(l).distanceTo(legsBefore[i])<1e-6,`${name}: other legs stayed`);});
  j.rleg1.rotation.x=0;
  j.tail0.rotation.x=.6;
  assert(tip(a.tail).distanceTo(tailBefore)>.01,`${name}: the tail swung`);
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legsBefore[i])<1e-6,`${name}: legs stayed under the tail`));
  j.tail0.rotation.x=0;
  const headBefore=tip(a.head);
  a.head.rotation.x=.5;
  assert(tip(a.head).distanceTo(headBefore)>.005,`${name}: the head turned`);
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legsBefore[i])<1e-6,`${name}: legs stayed under the head`));
 }
});

// A leg's world-space extent with its skin applied (Box3.setFromObject does not follow a skin's bones).
const V=new THREE.Vector3();
function legBox(a,leg){
 a.g.updateMatrixWorld(true);const box=new THREE.Box3();
 leg.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 leg.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;
  for(let i=0;i<p.count;i++){if(o.isSkinnedMesh)o.getVertexPosition(i,V);else V.fromBufferAttribute(p,i);box.expandByPoint(V.applyMatrix4(o.matrixWorld));}});
 return box;
}
const meshesOf=leg=>{const m=[];leg.traverse(o=>{if(o.isMesh)m.push(o);});return m;};

test('each leg of every horse and unicorn hangs on three bones, hip, knee and fetlock, and keeps its hoof',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  for(const leg of a.legs){
   for(const k of [0,1,2])assert(j[`${leg.name}_${k}`]?.isBone,`${name}: ${leg.name}_${k}`);
   const parts=meshesOf(leg);
   assert(parts.length>=3&&parts.every(m=>m.isSkinnedMesh),`${name}: ${leg.name} is skinned`);
   // the hoof is the darkest, lowest piece: it is still in the skin, on the floor
   const box=legBox(a,leg);
   assert(Math.abs(box.min.y)<.01,`${name}: ${leg.name} stands on the floor, not ${box.min.y}`);
   assert(box.max.y-box.min.y>.5*a.legs[0].position.y,`${name}: ${leg.name} keeps its full length`);
  }
 }
});

test('turning a horse\'s knee swings the hoof and leaves the thigh where it was',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints,leg=j.lleg0,before=legBox(a,leg);
  j.lleg0_1.rotation.x=.6;
  const after=legBox(a,leg);
  assert(Math.abs(after.max.y-before.max.y)<1e-6,`${name}: the thigh stayed`);
  assert(Math.abs(after.min.y-before.min.y)>.03||Math.abs(after.min.z-before.min.z)>.03,`${name}: the hoof swung`);
  // nothing else moved
  for(const other of a.legs)if(other!==leg)assert(legBox(a,other).min.y<.01,`${name}: other legs stayed`);
 }
});

test('turning the hip carries the whole skinned leg, hoof and sock included',()=>{
 for(const name of FAMILY){
  const a=make(name),leg=a.joints.rleg1,before=legBox(a,leg);
  leg.rotation.x=.5;
  const after=legBox(a,leg);
  assert(after.min.distanceTo(before.min)>.05,`${name}: the foot swung with the hip`);
 }
});
