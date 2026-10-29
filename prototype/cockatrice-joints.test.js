import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=['chickatrice','cockatrice','pyrolisk'];
const make=name=>createCreature({name,symbol:99,color:11});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};

test('every chickatrice, cockatrice and pyrolisk has head, neck, tail, wings and four legs as named joints',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert(j.head===a.head,name);
  // (plain asserts: assert.equal on scene objects diffs whole graphs when it fails)
  for(let i=0;i<4;i++)assert(j['neck'+i]?.isBone,`${name}: neck${i}`);
  for(let i=1;i<4;i++)assert(j['neck'+i].parent===j['neck'+(i-1)],`${name}: neck${i} hangs on neck${i-1}`);
  assert(a.head.parent===j.neck3,`${name}: the head rides the top of the neck`);
  assert(j.tail0===a.tail,`${name}: tail0`);
  for(const side of ['l','r'])for(let i=0;i<2;i++){
   const leg=j[`${side}leg${i}`];
   assert(leg&&a.legs.includes(leg),`${name}: ${side}leg${i}`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   assert.equal(leg.position.z>0,i===0,`${name}: leg${i} front to back`);
  }
  assert(j.lwing&&j.rwing&&j.lwing.position.x<0&&j.rwing.position.x>0,`${name}: wings`);
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length,`${name}: every joint its own`);
 }
});

test('bending the neck carries the head; turning the head moves the head only',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints,head=world(a.head),legs=a.legs.map(world);
  j.neck1.rotation.x=.6;
  assert(world(a.head).distanceTo(head)>.01,`${name}: the head went with the neck`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legs[i])<1e-9,`${name}: leg ${i} stayed`));
  j.neck1.rotation.x=0;
  const neck=world(j.neck3);a.head.rotation.x=.5;
  assert(world(j.neck3).distanceTo(neck)<1e-9,`${name}: the neck stayed under the head`);
 }
});

test('turning the tail moves the tail and nothing before it; turning a hip moves that leg only',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  const headBefore=world(a.head),legBefore=a.legs.map(world),tailTip=tip(j.tail0);
  j.tail0.rotation.y=.6;
  assert(tip(j.tail0).distanceTo(tailTip)>.01,`${name}: the tail swung`);
  assert(world(a.head).distanceTo(headBefore)<1e-6,`${name}: head stayed`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legBefore[i])<1e-6,`${name}: leg ${i} stayed`));
  j.tail0.rotation.y=0;
  const leg=j.rleg1,before=tip(leg),others=a.legs.filter(l=>l!==leg).map(l=>[l,tip(l)]);
  leg.rotation.x=.5;
  assert(tip(leg).distanceTo(before)>.005,`${name}: the leg swung`);
  for(const [l,b] of others)assert(tip(l).distanceTo(b)<1e-6,`${name}: other legs stayed`);
 }
});
