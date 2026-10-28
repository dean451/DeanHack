import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {KOBOLDS,createKobold} from './kobold.js';

const tip=o=>{
 let r=o;while(r.parent)r=r.parent;r.updateMatrixWorld(true);
 if(!o.isBone)return new THREE.Box3().setFromObject(o).max.clone();
 while(o.children.some(c=>c.isBone))o=o.children.find(c=>c.isBone);
 return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
};

test('every kobold has head, neck, tail, arms and legs as named joints',()=>{
 assert(KOBOLDS.length>=4);
 for(const name of KOBOLDS){
  const a=createKobold(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  assert(j.tail0.isBone&&j.tail0.parent.parent===a.tail,`${name}: tail0 is the first bone under the tail pivot`);
  for(const side of ['l','r'])for(const [stem,list] of [['fore',a.arms],['leg1',a.legs]]){
   const o=j[side+stem];
   assert(o&&list.includes(o),`${name}: ${side}${stem}`);
   assert.equal(o.position.x<0,side==='l',`${name}: left is -x`);
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length-1,`${name}: only head and neck0 share a group`);
 }
});

test('turning the tail moves the tail only; turning an arm or a hip moves that limb only; the head carries its face',()=>{
 for(const name of KOBOLDS){
  const a=createKobold(name),j=a.joints,parts=[...a.arms,...a.legs,j.tail0];
  for(const key of ['tail0','lfore','rfore','lleg1','rleg1']){
   const joint=j[key],others=parts.filter(o=>o!==joint).map(o=>[o,tip(o)]),before=tip(joint),face=tip(a.head);
   joint.rotation.x+=.6;
   assert(tip(joint).distanceTo(before)>.005,`${name}: ${key} swung`);
   for(const [o,b] of others)assert(tip(o).distanceTo(b)<1e-6,`${name}: ${key} left ${o.name} alone`);
   assert(tip(a.head).distanceTo(face)<1e-6,`${name}: ${key} left the head alone`);
   joint.rotation.x-=.6;
  }
  const limbs=parts.map(tip);
  a.head.rotation.x=.5;
  parts.forEach((o,i)=>assert(tip(o).distanceTo(limbs[i])<1e-6,`${name}: part ${i} stayed under the head`));
 }
});

test('the tail is one skinned mesh on bones tail0..tail4: bending tail2 carries the tip and leaves the root',()=>{
 for(const name of KOBOLDS){
  const a=createKobold(name),j=a.joints,m=a.tail.children.find(o=>o.isSkinnedMesh);
  assert(m,`${name}: skinned tail`);
  assert.equal(a.tail.children.filter(o=>o.isMesh).length,1,`${name}: one tail mesh`);
  for(let i=0;i<5;i++)assert(j['tail'+i]?.isBone,`${name}: tail${i}`);
  const tipAt=()=>{a.g.updateMatrixWorld(true);return new THREE.Vector3().setFromMatrixPosition(j.tail4.matrixWorld);};
  a.g.updateMatrixWorld(true);
  const root=new THREE.Vector3().setFromMatrixPosition(j.tail1.matrixWorld),before=tipAt();
  j.tail2.rotation.z=.7;
  assert(tipAt().distanceTo(before)>.03,`${name}: the tip swung`);
  assert(new THREE.Vector3().setFromMatrixPosition(j.tail1.matrixWorld).distanceTo(root)<1e-6,`${name}: tail1 stayed`);
  // the hide follows: skinned vertices past the bend move, those before it do not
  const g=m.geometry,ix=g.attributes.skinIndex,v=new THREE.Vector3();
  m.skeleton.update();
  let moved=0,still=0;
  for(let i=0;i<g.attributes.position.count;i++){
   const b=ix.getX(i);
   const world=m.getVertexPosition?m.getVertexPosition(i,v).clone():v.fromBufferAttribute(g.attributes.position,i).clone();
   const rest=new THREE.Vector3().fromBufferAttribute(g.attributes.position,i);
   const d=world.distanceTo(rest);
   if(b>=3&&d>.01)moved++;
   if(b===0&&d>1e-6)still++;
  }
  assert(moved>0,`${name}: hide past the bend moved`);
  assert.equal(still,0,`${name}: hide before the bend stayed`);
 }
});
