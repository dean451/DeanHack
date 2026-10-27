import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {KOBOLDS,createKobold} from './kobold.js';

const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};

test('every kobold has head, neck, tail, arms and legs as named joints',()=>{
 assert(KOBOLDS.length>=4);
 for(const name of KOBOLDS){
  const a=createKobold(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  assert.equal(j.tail0,a.tail,`${name}: tail0`);
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
  const a=createKobold(name),j=a.joints,parts=[...a.arms,...a.legs,a.tail];
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
