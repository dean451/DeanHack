import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=['rothe','mumak','mastodon','titanothere','baluchitherium','leocrotta','wumpus'];
const make=name=>createCreature({name,symbol:'q'.charCodeAt(0),color:7});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const tip=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o).max.clone();};

test('every q beast has head, neck, tail and its four legs as named joints',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert(j.neck0,`${name}: neck0`);
  assert.equal(j.tail0,a.tail,`${name}: tail0`);
  for(const side of ['l','r'])for(const k of [0,1]){
   const leg=j[`${side}leg${k}`];
   assert(leg&&a.legs.includes(leg),`${name}: ${side}leg${k}`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   assert.equal(leg.position.z>0,k===0,`${name}: fore is +z`);
  }
  const {neck0,...rest}=j;
  assert.equal(new Set(Object.values(rest)).size,Object.keys(rest).length,`${name}: every joint its own`);
 }
});

test('turning the tail moves only the tail, a hip only that leg, the head only itself',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  const headBefore=world(a.head),legBefore=a.legs.map(world),tailTip=tip(a.tail);
  j.tail0.rotation.x=.6;
  assert(tip(a.tail).distanceTo(tailTip)>.01,`${name}: the tail swung`);
  assert(world(a.head).distanceTo(headBefore)<1e-6,`${name}: head stayed`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legBefore[i])<1e-6,`${name}: leg ${i} stayed`));
  j.tail0.rotation.x=0;
  const leg=j.rleg1,before=tip(leg),others=a.legs.filter(l=>l!==leg).map(l=>[l,tip(l)]);
  leg.rotation.x=.5;
  assert(tip(leg).distanceTo(before)>.005,`${name}: the leg swung`);
  for(const [l,b] of others)assert(tip(l).distanceTo(b)<1e-6,`${name}: other legs stayed`);
  leg.rotation.x=0;
  const faceBefore=tip(a.head),legsBefore=a.legs.map(tip);
  a.head.rotation.x=.5;
  assert(tip(a.head).distanceTo(faceBefore)>.005,`${name}: the head turned`);
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legsBefore[i])<1e-6,`${name}: leg ${i} stayed under the head`));
 }
});

test('a one-mesh leg is skinned on three bones; bending the knee moves the foot and not the hip',()=>{
 for(const name of ['rothe','wumpus','baluchitherium']){
  const a=make(name),j=a.joints;
  for(const leg of a.legs){
   const skinned=leg.children.filter(o=>o.isSkinnedMesh);
   assert.equal(skinned.length,1,`${name} ${leg.name}: one skinned mesh`);
   for(const k of [0,1,2])assert(j[`${leg.name}_${k}`]?.isBone,`${name}: ${leg.name}_${k}`);
  }
  const knee=j.rleg1_1,hip=j.rleg1_0,foot=j.rleg1_2;
  const hipAt=world(hip),footAt=world(foot),otherFoot=world(j.lleg1_2);
  knee.rotation.x=.6;
  assert(world(foot).distanceTo(footAt)>.02,`${name}: the foot swung`);
  assert(world(hip).distanceTo(hipAt)<1e-6,`${name}: the hip stayed`);
  assert(world(j.lleg1_2).distanceTo(otherFoot)<1e-6,`${name}: the other leg stayed`);
 }
});
