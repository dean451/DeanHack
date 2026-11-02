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
