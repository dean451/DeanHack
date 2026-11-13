import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// The creature plan, family J stage 1: the jabberwock's named joints and its tail on five bones.
const KINDS=['jabberwock','vorpal jabberwock'];
const make=name=>createCreature({name,symbol:74,color:5});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const box=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o);};
const tailMeshes=a=>a.tail.children.filter(o=>o.isSkinnedMesh);
// every tail vertex in world space, as the skin places it
const verts=a=>{a.g.updateMatrixWorld(true);const v=new THREE.Vector3(),out=[];for(const m of tailMeshes(a))for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push({m,i,p:v.applyMatrix4(m.matrixWorld).clone()});}return out;};

test('every jabberwock has its head, jaw, arms, legs, wings and five tail bones as named joints',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  assert.equal(j.jaw,a.jaw,name);assert.equal(j.jaw.parent,j.head,`${name}: the jaw hangs on the head`);
  for(const [stem,list] of [['fore',a.arms],['leg1',a.legs],['wing',a.wings]])for(const side of ['l','r']){
   const o=j[side+stem];
   assert(o&&list.includes(o),`${name}: ${side}${stem}`);
   assert.equal(o.position.x<0,side==='l',`${name}: ${side}${stem}, left is -x`);
   assert.equal(a.g.getObjectByName(side+stem),o,`${name}: ${side}${stem} named`);
  }
  for(let i=0;i<5;i++)assert(j[`tail${i}`]?.isBone,`${name}: tail${i}`);
  assert.equal(j.tail0.parent,a.tail,`${name}: the chain hangs on the tail pivot`);
  for(let i=1;i<5;i++)assert.equal(j[`tail${i}`].parent,j[`tail${i-1}`],`${name}: tail${i} on tail${i-1}`);
  const skinned=tailMeshes(a);
  assert.equal(skinned.length,3,`${name}: hide, blades and glow skinned`);
  assert(skinned.every(m=>m.skeleton===skinned[0].skeleton),`${name}: one skeleton for the tail`);
  assert(!a.tail.children.some(o=>o.isMesh&&!o.isSkinnedMesh),`${name}: nothing loose on the tail`);
  assert.equal(new Set(Object.entries(j).filter(([k])=>k!=='neck0').map(([,o])=>o)).size,Object.keys(j).length-1,`${name}: every joint its own`);
 }
});

test('at rest the skinned tail sits exactly where the plain one did',()=>{
 for(const name of KINDS){
  const a=make(name);
  for(const {m,i,p} of verts(a)){
   const plain=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld);
   assert(p.distanceTo(plain)<1e-6,`${name}: tail vertex ${i} moved ${p.distanceTo(plain)}`);
  }
 }
});

test('bending a tail joint moves the tail past it, crescent blade and glow too, and nothing before it',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints,rest=verts(a),root=world(j.tail0),head=world(a.head),legs=a.legs.map(world);
  j.tail2.rotation.x=.7;
  const bent=verts(a);let before=0,past=0;const pastBy=new Map();
  rest.forEach(({m,i,p},n)=>{
   const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight,d=p.distanceTo(bent[n].p);let onPast=0;
   for(let k=0;k<4;k++)if(si.getComponent(i,k)>=2)onPast+=sw.getComponent(i,k);
   if(onPast===0)before=Math.max(before,d);else if(onPast>.999){past=Math.max(past,d);pastBy.set(m.material,Math.max(pastBy.get(m.material)||0,d));}
  });
  assert(past>.03,`${name}: the tail past the joint moved ${past}`);
  assert(before<1e-6,`${name}: the tail before the joint stayed (${before})`);
  for(const m of tailMeshes(a))assert((pastBy.get(m.material)||0)>.03,`${name}: the ${m.material.emissiveIntensity>1?'glow':'blade or hide'} followed`);
  assert(world(j.tail0).distanceTo(root)<1e-9,`${name}: the root stayed`);
  assert(world(a.head).distanceTo(head)<1e-9,`${name}: the head stayed`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legs[i])<1e-9,`${name}: leg ${i} stayed`));
 }
});

test('turning a limb, wing or the head moves that part only',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints,parts=['lfore','rfore','lleg1','rleg1','lwing','rwing'];
  for(const n of [...parts,'head']){
   const o=j[n],others=parts.filter(k=>k!==n).map(k=>[k,box(j[k])]),moved=box(o).max.clone(),tail=box(a.tail);
   o.rotation.x+=.5;
   assert(box(o).max.distanceTo(moved)>.01,`${name}: ${n} turned`);
   for(const [k,b] of others)assert(box(j[k]).equals(b),`${name}: ${k} stayed when ${n} turned`);
   assert(box(a.tail).equals(tail),`${name}: the tail stayed when ${n} turned`);
   o.rotation.x-=.5;
  }
 }
});

test('a freshly built jabberwock measures the same before its first frame as after it',()=>{
 for(const name of KINDS){
  // (a skinned mesh caches its box, so the box after a frame is measured on a second jabberwock)
  const fresh=new THREE.Box3().setFromObject(make(name).g),b=make(name);
  b.g.updateMatrixWorld(true);
  const after=new THREE.Box3().setFromObject(b.g);
  assert(fresh.min.distanceTo(after.min)<1e-6&&fresh.max.distanceTo(after.max)<1e-6,`${name}: box ${fresh.min.toArray()} ${fresh.max.toArray()} against ${after.min.toArray()} ${after.max.toArray()}`);
 }
});
