import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FORMS=['xan','chillbug'];
const make=name=>createCreature({name,symbol:120,color:3});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};

test('xans and chillbugs have a head, the wings and six legs as named joints',()=>{
 for(const name of FORMS){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  for(const side of ['l','r']){
   assert.equal(j[side+'wing'].position.x<0,side==='l',`${name}: ${side} wing side`);
   for(let i=0;i<3;i++){
    const leg=j[`${side}leg${i}`];
    assert(leg&&a.legs.includes(leg),`${name}: ${side}leg${i} is one of the six legs`);
    assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   }
   assert(j.lleg0.position.z>0&&j.lleg0.position.z>j.lleg2.position.z,`${name}: legs run front to hind`);
  }
  assert.equal(a.legs.length,6);assert.equal(a.wings.length,2);
 }
});

test('turning the head carries the eyes, feelers and mouthparts and nothing behind it; a hip moves its own leg only',()=>{
 for(const name of FORMS){
  const a=make(name),j=a.joints;
  let meshes=0;a.head.traverse(o=>{if(o.isMesh)meshes++;});
  assert(meshes>=5,`${name}: skull, two eyes and two feelers ride the head (${meshes})`);
  const before=new Map(a.legs.map(l=>[l,world(l)]));
  const tip=new THREE.Box3().setFromObject(a.head).max.clone();
  j.neck0.rotation.y=.6;a.g.updateMatrixWorld(true);
  assert(tip.distanceTo(new THREE.Box3().setFromObject(a.head).max)>.01,`${name}: the head tip moved`);
  for(const l of a.legs)assert.equal(world(l).distanceTo(before.get(l)),0,`${name}: legs stay`);
  j.neck0.rotation.y=0;
  const box=new THREE.Box3().setFromObject(j.rleg1),other=new THREE.Box3().setFromObject(j.lleg1);
  j.rleg1.rotation.z=.5;a.g.updateMatrixWorld(true);
  const moved=new THREE.Box3().setFromObject(j.rleg1);
  assert(moved.min.distanceTo(box.min)>.01||moved.max.distanceTo(box.max)>.01,`${name}: the leg followed its hip`);
  const still=new THREE.Box3().setFromObject(j.lleg1);
  assert(still.min.distanceTo(other.min)<1e-9&&still.max.distanceTo(other.max)<1e-9,`${name}: the other leg stays`);
 }
});

test('each leg is one skinned mesh on three bones: bending the knee swings the foot and leaves the thigh',()=>{
 const verts=leg=>{const m=leg.children.find(o=>o.isSkinnedMesh),p=m.geometry.attributes.position,v=new THREE.Vector3(),out=[];m.updateMatrixWorld(true);m.skeleton.update();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);m.applyBoneTransform(i,v);out.push(v.clone().applyMatrix4(m.matrixWorld));}return out;};
 for(const name of FORMS){
  const a=make(name),j=a.joints;
  for(const leg of a.legs){
   assert.equal(leg.children.filter(o=>o.isMesh).length,1,`${name}: ${leg.name} is one mesh`);
   assert(leg.children.some(o=>o.isSkinnedMesh),`${name}: ${leg.name} is skinned`);
   for(let k=0;k<3;k++)assert(j[`${leg.name}_${k}`]?.isBone,`${name}: ${leg.name}_${k}`);
  }
  a.g.updateMatrixWorld(true);
  const leg=j.rleg1,rest=verts(leg);
  j.rleg1_2.rotation.x=.7;a.g.updateMatrixWorld(true);
  const now=verts(leg),moved=now.map((p,i)=>p.distanceTo(rest[i]));
  assert(Math.max(...moved)>.03,`${name}: the foot swung (${Math.max(...moved)})`);
  assert(moved[0]<1e-9,`${name}: the hip end of the tube stayed (${moved[0]})`);
 }
});

test('the xan abdomen is one skinned hide on five bones: bending tail2 swings the barb and leaves the thorax; the chillbug has none',()=>{
 const a=make('xan'),j=a.joints;
 for(let k=0;k<5;k++)assert(j['tail'+k]?.isBone,`tail${k}`);
 const hide=a.body.children.find(o=>o.isSkinnedMesh&&o.skeleton.bones[0]===j.tail0);
 assert(hide,'the abdomen is a skinned mesh on tail0..tail4');
 const barb=j.tail4.children.find(o=>o.isMesh&&!o.isSkinnedMesh);
 assert(barb,'the barb rides tail4');
 a.g.updateMatrixWorld(true);
 const at=o=>o.getWorldPosition(new THREE.Vector3()),b0=at(barb),h0=at(j.head),t1=at(j.tail1);
 j.tail2.rotation.x=.6;a.g.updateMatrixWorld(true);
 assert(at(barb).distanceTo(b0)>.03,'the barb followed the bend');
 assert(at(j.head).distanceTo(h0)<1e-9&&at(j.tail1).distanceTo(t1)<1e-9,'the head and the root of the abdomen stayed');
 assert(!make('chillbug').joints.tail0,'the chillbug has no abdomen chain');
});
