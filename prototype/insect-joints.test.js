import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=['giant ant','soldier ant','fire ant','snow ant','killer bee','queen bee','giant beetle','locust'];
const make=name=>createCreature({name,symbol:97,color:3});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const lowest=o=>{o.updateMatrixWorld(true);let p=null;o.traverse(m=>{if(!m.isMesh)return;const b=new THREE.Box3().setFromObject(m);if(!p||b.min.y<p.min.y)p=b;});return p;};

test('every ant, bee, beetle and locust has its head, neck and six legs as named joints',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  for(const side of ['l','r'])for(let i=0;i<3;i++){
   const leg=j[`${side}leg${i}`];
   assert(leg,`${name}: ${side}leg${i}`);
   assert(a.legs.includes(leg),`${name}: ${side}leg${i} is one of the six legs`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length-1,`${name}: only head and neck0 share a group`);
 }
 for(const name of ['giant ant','soldier ant','fire ant','snow ant']){
  const j=make(name).joints;
  assert(j.ljaw&&j.rjaw&&j.rjaw.position.x>0&&j.ljaw.position.x<0,`${name}: jaws`);
 }
 for(const name of ['killer bee','queen bee']){
  const j=make(name).joints;
  assert(j.lwing&&j.rwing&&j.lwing.position.x<0&&j.rwing.position.x>0,`${name}: wings`);
 }
});

test('turning the neck moves the head, jaws and feelers and nothing behind it; turning a hip moves that leg only',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  const body=a.body.children.find(o=>o.userData.part==='body');
  const before=new Map(a.legs.map(l=>[l,world(l)]));
  const headTip=new THREE.Box3().setFromObject(a.head).max.clone();
  j.neck0.rotation.y=.5;a.g.updateMatrixWorld(true);
  const after=new THREE.Box3().setFromObject(a.head).max;
  assert(headTip.distanceTo(after)>.01,`${name}: the head tip moved ${headTip.distanceTo(after)}`);
  for(const l of a.legs)assert.equal(world(l).distanceTo(before.get(l)),0,`${name}: legs stay`);
  assert(body&&body.parent===a.body,`${name}: the body mesh stays`);
  j.neck0.rotation.y=0;
  const foot=new THREE.Box3().setFromObject(j.rleg1),other=new THREE.Box3().setFromObject(j.lleg1),headBox=new THREE.Box3().setFromObject(a.head);
  j.rleg1.rotation.z=.5;a.g.updateMatrixWorld(true);
  const moved=new THREE.Box3().setFromObject(j.rleg1);
  assert(moved.min.distanceTo(foot.min)>.01||moved.max.distanceTo(foot.max)>.01,`${name}: the leg followed its hip`);
  assert(new THREE.Box3().setFromObject(j.lleg1).min.distanceTo(other.min)<1e-9,`${name}: the other leg stays`);
  assert(new THREE.Box3().setFromObject(a.head).min.distanceTo(headBox.min)<1e-9,`${name}: the head stays`);
 }
});
