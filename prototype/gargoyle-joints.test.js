import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=[['gargoyle',11],['winged gargoyle',11],['gremlin',2]];
const make=([name,color])=>createCreature({name,symbol:'g'.charCodeAt(0),color});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};

test('every gargoyle and gremlin has head, neck, tail and its legs as named joints',()=>{
 for(const f of FAMILY){
  const a=make(f),j=a.joints,name=f[0];
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  assert.equal(j.tail0,a.tail,`${name}: tail0`);
  for(const side of ['l','r']){
   const leg=j[`${side}leg1`];
   assert(leg&&a.legs.includes(leg),`${name}: ${side}leg1`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
  }
  if(/winged/.test(name))assert(j.lwing&&j.rwing&&j.lwing.position.x<0&&j.rwing.position.x>0,`${name}: wings`);
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length-1,`${name}: only head and neck0 share a group`);
 }
});

test('turning the tail moves the tail and nothing before it; turning a hip moves that leg only; the head carries its face',()=>{
 for(const f of FAMILY){
  const a=make(f),j=a.joints,name=f[0];
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
  leg.rotation.x=0;
  const faceBefore=tip(a.head),legsBefore=a.legs.map(tip);
  a.head.rotation.x=.5;
  assert(tip(a.head).distanceTo(faceBefore)>.01,`${name}: the head turned with its face`);
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legsBefore[i])<1e-6,`${name}: leg ${i} stayed under the head`));
 }
});
