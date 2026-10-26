import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHobbit} from './hobbit.js';
import {createBugbear} from './bugbear.js';
import {DWARVES,createDwarf} from './dwarf.js';
import {MIND_FLAYER_KINDS,createMindFlayer} from './mind-flayer.js';

const FAMILY=[['hobbit',createHobbit],['bugbear',createBugbear],
 ...DWARVES.map(n=>[n,()=>createDwarf(n)]),
 ...Object.keys(MIND_FLAYER_KINDS).map(n=>[n,()=>createMindFlayer(n)])];
const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};

test('every hobbit, dwarf, bugbear and mind flayer has head, neck, arms and legs as named joints',()=>{
 assert(FAMILY.length>=6);
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  for(const side of ['l','r']){
   for(const [stem,list] of [['fore',a.arms],['leg1',a.legs]]){
    const o=j[side+stem];
    assert(o&&list.includes(o),`${name}: ${side}${stem}`);
    assert.equal(o.position.x<0,side==='l',`${name}: left is -x`);
    assert.equal(o.name,side+stem,name);
   }
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length-1,`${name}: only head and neck0 share a group`);
 }
});

test('turning an arm moves that arm only; turning a hip moves that leg only; the head carries its face',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  for(const key of ['lfore','rfore','lleg1','rleg1']){
   const joint=j[key],all=[...a.arms,...a.legs],others=all.filter(o=>o!==joint).map(o=>[o,tip(o)]),before=tip(joint);
   joint.rotation.x=.6;
   assert(tip(joint).distanceTo(before)>.005,`${name}: ${key} swung`);
   for(const [o,b] of others)assert(tip(o).distanceTo(b)<1e-6,`${name}: ${key} left ${o.name} alone`);
   joint.rotation.x=0;
  }
  const face=tip(a.head),limbs=[...a.arms,...a.legs].map(tip);
  a.head.rotation.x=.5;
  assert(tip(a.head).distanceTo(face)>.01,`${name}: the head turned with its face`);
  [...a.arms,...a.legs].forEach((o,i)=>assert(tip(o).distanceTo(limbs[i])<1e-6,`${name}: limb ${i} stayed under the head`));
 }
});
