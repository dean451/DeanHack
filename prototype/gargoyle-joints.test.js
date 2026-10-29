import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=[['gargoyle',11],['winged gargoyle',11],['gremlin',2]];
const make=([name,color])=>createCreature({name,symbol:'g'.charCodeAt(0),color});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const tip=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o).max.clone();};

test('every gargoyle and gremlin has head, neck, tail and its legs as named joints',()=>{
 for(const f of FAMILY){
  const a=make(f),j=a.joints,name=f[0];
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  for(let i=0;i<4;i++)assert(j[`neck${i}`]?.isBone,`${name}: neck${i}`);
  assert(a.head.parent===j.neck3,`${name}: the head rides the top of the neck`);
  for(let i=0;i<5;i++)assert(j[`tail${i}`]?.isBone,`${name}: tail${i}`);
  assert.equal(j.tail0.parent.parent,a.tail,`${name}: the chain hangs under the tail pivot`);
  assert(a.tail.children.some(o=>o.isSkinnedMesh&&o.userData.part==='tail'),`${name}: one skinned tail`);
  for(const side of ['l','r']){
   const leg=j[`${side}leg1`];
   assert(leg&&a.legs.includes(leg),`${name}: ${side}leg1`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
  }
  if(/winged/.test(name))assert(j.lwing&&j.rwing&&j.lwing.position.x<0&&j.rwing.position.x>0,`${name}: wings`);
  for(const side of ['l','r'])assert(j[`${side}fore`]&&j[`${side}fore`].position.x<0===(side==='l'),`${name}: ${side}fore`);
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length,`${name}: every joint its own`);
 }
});

test('turning the tail moves the tail and nothing before it; turning a hip moves that leg only; the head carries its face',()=>{
 for(const f of FAMILY){
  const a=make(f),j=a.joints,name=f[0];
  const headBefore=world(a.head),legBefore=a.legs.map(world),tailTip=tip(a.tail);
  j.tail0.rotation.y=.6;
  assert(tip(a.tail).distanceTo(tailTip)>.01,`${name}: the tail swung`);
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

test('bending a tail joint moves the tail past it and leaves the tail before it, spade and tuft with it',()=>{
 for(const f of FAMILY){
  const a=make(f),j=a.joints,name=f[0],m=a.tail.children.find(o=>o.isSkinnedMesh);
  const verts=()=>{a.g.updateMatrixWorld(true);const v=new THREE.Vector3(),out=[];for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push(v.applyMatrix4(m.matrixWorld).clone());}return out;};
  const rest=verts(),root=world(j.tail0),endCap=a.tail.children.find(o=>!o.isSkinnedMesh)??j.tail4.children[0],capBefore=world(endCap);
  j.tail2.rotation.x=.7;
  const bent=verts();let before=0,past=0;
  const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
  rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);let onPast=0;for(let k=0;k<4;k++)if(si.getComponent(i,k)>=2)onPast+=sw.getComponent(i,k);
   if(onPast===0)before=Math.max(before,d);else if(onPast>.999)past=Math.max(past,d);});
  assert(past>.02,`${name}: the tail past the joint moved ${past}`);
  assert(before<1e-6,`${name}: the tail before the joint stayed (${before})`);
  assert(world(j.tail0).distanceTo(root)<1e-9,`${name}: the root stayed`);
  assert(world(endCap).distanceTo(capBefore)>.02,`${name}: the spade or tuft followed the bend`);
 }
});

test('each arm hangs from its own shoulder group: turning it moves that arm only',()=>{
 for(const f of FAMILY){
  const a=make(f),j=a.joints,name=f[0];
  for(const side of ['l','r']){
   const arm=j[`${side}fore`];
   assert(arm&&a.g.getObjectByName(`${side}fore`)===arm,`${name}: ${side}fore`);
   assert.equal(arm.position.x<0,side==='l',`${name}: left is -x`);
   assert(arm.children.length>=2,`${name}: ${side}fore holds the arm's parts`);
   const other=j[`${side==='l'?'r':'l'}fore`],armBefore=tip(arm),otherBefore=tip(other),headBefore=tip(a.head),legsBefore=a.legs.map(tip);
   arm.rotation.x=-.8;
   assert(tip(arm).distanceTo(armBefore)>.02,`${name}: ${side}fore swung`);
   assert(tip(other).distanceTo(otherBefore)<1e-6,`${name}: the other arm stayed`);
   assert(tip(a.head).distanceTo(headBefore)<1e-6,`${name}: the head stayed`);
   a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legsBefore[i])<1e-6,`${name}: leg ${i} stayed`));
   arm.rotation.x=0;
  }
 }
});

test('the neck is a chain of bones: turning a neck joint carries the head and nothing before it',()=>{
 for(const f of FAMILY){
  const a=make(f),j=a.joints,name=f[0];
  const head=tip(a.head),neck0=world(j.neck0),limbs=[...a.legs,j.lfore,j.rfore].map(tip),tail=tip(a.tail);
  j.neck1.rotation.x=.5;
  assert(tip(a.head).distanceTo(head)>.01,`${name}: the head went with the neck`);
  assert(world(j.neck0).distanceTo(neck0)<1e-9,`${name}: the neck's root stayed`);
  [...a.legs,j.lfore,j.rfore].forEach((o,i)=>assert(tip(o).distanceTo(limbs[i])<1e-6,`${name}: ${o.name} stayed`));
  assert(tip(a.tail).distanceTo(tail)<1e-6,`${name}: the tail stayed`);
 }
});
