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
  assert.equal(j.head,a.head);assert.equal(j.neck0,a.head);assert.equal(j.tail0,a.tail);
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
  const a=createCreature({name,symbol:67,color:3}),j=a.joints;
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
