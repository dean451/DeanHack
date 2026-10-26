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

const SKINNED=[['hobbit',createHobbit],...DWARVES.map(n=>[n,()=>createDwarf(n)])];

test('the hobbit\'s and every dwarf\'s arms and legs are one skinned mesh on three bones; bending the elbow or knee carries the hand or foot and leaves the shoulder',()=>{
 for(const [name,make] of SKINNED){
 const a=make(),j=a.joints;
 for(const side of ['l','r'])for(const stem of ['fore','leg1']){
  const group=j[side+stem],bones=[0,1,2].map(k=>j[`${side}${stem}_${k}`]);
  bones.forEach((b,k)=>assert(b?.isBone,`${side}${stem}_${k}`));
  const m=group.children.find(o=>o.isSkinnedMesh);
  assert(m,`${side}${stem} is one skinned mesh`);
  const verts=()=>{a.g.updateMatrixWorld(true);const v=new THREE.Vector3();return Array.from({length:m.geometry.attributes.position.count},(_,n)=>m.getVertexPosition(n,v).applyMatrix4(m.matrixWorld).clone());};
  const rest=verts(),si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
  bones[1].rotation.x=.6;
  const bent=verts();let before=0,past=0;
  rest.forEach((r,n)=>{const d=r.distanceTo(bent[n]);let onPast=0;for(let k=0;k<4;k++)if(si.getComponent(n,k)>=1)onPast+=sw.getComponent(n,k);
   if(onPast===0)before=Math.max(before,d);else if(onPast>.999)past=Math.max(past,d);});
  assert(past>.02,`${name} ${side}${stem}: past the joint moved ${past}`);
  assert(before<1e-6,`${name} ${side}${stem}: above the joint stayed (${before})`);
 }
 }
});

test('the weapon socket of the hobbit and every dwarf follows a bent right elbow',()=>{
 for(const [name,make] of SKINNED){
  const a=make(),p=()=>{a.g.updateMatrixWorld(true);return a.weaponSocket.getWorldPosition(new THREE.Vector3());};
  const rest=p();a.joints.rfore_1.rotation.x=.8;
  assert(p().distanceTo(rest)>.05,name);
 }
});
