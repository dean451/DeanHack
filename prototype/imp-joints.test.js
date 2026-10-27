import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createImp} from './imp.js';
import {createHomunculus} from './homunculus.js';
import {createQuasit} from './quasit.js';
import {createTengu} from './tengu.js';
import {createLemure} from './lemure.js';

const FAMILY=[['imp',createImp],['uranium imp',()=>createImp('uranium')],['homunculus',createHomunculus],
 ['quasit',createQuasit],['tengu',createTengu],['lemure',createLemure]];
const at=o=>{let r=o;while(r.parent)r=r.parent;r.updateMatrixWorld(true);return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);};
const tip=o=>{
 let r=o;while(r.parent)r=r.parent;r.updateMatrixWorld(true);
 if(!o.isBone)return new THREE.Box3().setFromObject(o).max.clone();
 while(o.children.some(c=>c.isBone))o=o.children.find(c=>c.isBone);
 return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
};

test('every imp-family member has head, neck, arms and legs as named joints, and tail and wings where it has them',()=>{
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
   }
   const w=j[side+'wing'];
   assert.equal(!!w,a.wings.length>0,`${name}: ${side}wing only where there are wings`);
   if(w)assert.equal(w.position.x<0,side==='l',`${name}: left wing is -x`);
  }
  assert.equal(!!j.tail0,!!a.tail,`${name}: tail0 only where there is a tail`);
  if(a.tail)assert(j.tail0===a.tail||j.tail0.isBone&&j.tail0.parent.parent===a.tail,`${name}: tail0 is the tail group or the first bone under it`);
 }
});

test('turning a joint moves that part only; the head carries its face',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  const keys=['lfore','rfore','lleg1','rleg1','tail0','lwing','rwing'].filter(k=>j[k]);
  for(const key of keys){
   const joint=j[key],others=keys.filter(k=>k!==key).map(k=>[j[k],tip(j[k])]),before=tip(joint);
   joint.rotation.x+=.6;
   assert(tip(joint).distanceTo(before)>.003,`${name}: ${key} swung`);
   for(const [o,b] of others)assert(tip(o).distanceTo(b)<1e-6,`${name}: ${key} left ${o.name} alone`);
   joint.rotation.x-=.6;
  }
  const face=tip(a.head),limbs=keys.map(k=>tip(j[k]));
  a.head.rotation.x=.5;
  assert(tip(a.head).distanceTo(face)>.01,`${name}: the head turned with its face`);
  keys.forEach((k,i)=>assert(tip(j[k]).distanceTo(limbs[i])<1e-6,`${name}: ${k} stayed under the head`));
 }
});

test('the imp\'s arms, legs and tail are skinned onto bones; bending an elbow, knee or tail joint carries what lies past it and leaves the root',()=>{
 for(const kind of ['red','uranium']){
  const a=createImp(kind),j=a.joints;
  for(const side of ['l','r'])for(const [stem,n] of [['fore',3],['leg1',4]]){
   const bones=Array.from({length:n},(_,k)=>j[`${side}${stem}_${k}`]);
   bones.forEach((b,k)=>assert(b?.isBone,`${kind}: ${side}${stem}_${k}`));
   const m=j[side+stem].children.find(o=>o.isSkinnedMesh);
   assert(m,`${kind}: ${side}${stem} is one skinned mesh`);
   const root=at(bones[0]),end=tip(bones[n-1]);
   bones[1].rotation.x=.6;
   assert(tip(bones[n-1]).distanceTo(end)>.01,`${kind}: ${side}${stem} end followed the bend`);
   assert(at(bones[0]).distanceTo(root)<1e-9,`${kind}: ${side}${stem} root stayed`);
   bones[1].rotation.x=0;
  }
  for(let i=0;i<5;i++)assert(j[`tail${i}`]?.isBone,`${kind}: tail${i}`);
  assert.equal(j.tail0.parent.parent,a.tail,`${kind}: the chain hangs under the tail pivot`);
  const end=tip(j.tail4),root=at(j.tail0);
  j.tail2.rotation.x=.7;
  assert(tip(j.tail4).distanceTo(end)>.02,`${kind}: the tail tip followed`);
  assert(at(j.tail0).distanceTo(root)<1e-9,`${kind}: the tail root stayed`);
  j.tail2.rotation.x=0;
 }
});
