import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NAMES=['baby long worm','long worm','baby purple worm','purple worm','remorhaz'];
const make=name=>createCreature({name,symbol:'w'.charCodeAt(0),color:7});
const under=(o,root)=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};

test('every worm has a neck and a head as named joints',()=>{
 for(const name of NAMES){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.neck0,a.tail,`${name}: neck0 is the swaying half`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0.name,'neck0');assert.equal(j.head.name,'head');
  assert(under(j.head,j.neck0),`${name}: the head rides the neck`);
  assert(!under(a.body,j.neck0),`${name}: the rear is not on the neck`);
 }
});

test('turning the neck carries the head and leaves the rear where it was',()=>{
 for(const name of NAMES){
  const a=make(name);a.g.updateMatrixWorld(true);
  const head0=world(a.joints.head),rear=a.body.children.filter(c=>!under(c,a.joints.neck0)),rear0=rear.map(world);
  a.joints.neck0.rotation.x+=.4;a.g.updateMatrixWorld(true);
  assert(world(a.joints.head).distanceTo(head0)>.01,`${name}: the head moved`);
  rear.forEach((c,i)=>assert(world(c).distanceTo(rear0[i])<1e-9,`${name}: the rear stayed`));
 }
});

test('the forward half is a chain: neck0, neck1, neck2, the head on the last',()=>{
 for(const name of NAMES){
  const a=make(name),j=a.joints;
  for(const k of ['neck0','neck1','neck2'])assert(j[k]&&j[k].name===k,`${name}: ${k}`);
  assert.equal(j.neck1.parent,j.neck0,name);assert.equal(j.neck2.parent,j.neck1,name);
  assert.equal(j.head.parent,j.neck2,`${name}: the head hangs on neck2`);
 }
});

test('turning neck1 or neck2 moves everything past it and nothing before it',()=>{
 for(const name of NAMES){
  for(const [k,past,before] of [['neck1',['neck2','head'],['neck0']],['neck2',['head'],['neck0','neck1']]]){
   const a=make(name);a.g.updateMatrixWorld(true);
   const j=a.joints,p0=past.map(n=>world(j[n])),b0=before.map(n=>world(j[n]));
   const meshes=[];j[k].traverse(o=>{if(o.isMesh)meshes.push(o);});
   assert(meshes.length>=3,`${name}: ${k} carries its ring, belly and band`);
   const m0=meshes.map(world);
   j[k].rotation.x+=.5;a.g.updateMatrixWorld(true);
   past.forEach((n,i)=>assert(world(j[n]).distanceTo(p0[i])>.005,`${name}: ${n} moved with ${k}`));
   before.forEach((n,i)=>assert(world(j[n]).distanceTo(b0[i])<1e-9,`${name}: ${n} stayed`));
   assert(meshes.some((m,i)=>world(m).distanceTo(m0[i])>.005),`${name}: the ring parts moved`);
  }
 }
});

test('a worm with the neck at rest keeps the same ring layout as before the chain',()=>{
 const a=make('purple worm');a.g.updateMatrixWorld(true);
 const w=a.joints.neck0.position;
 assert.deepEqual([w.x,w.y,w.z].map(v=>+v.toFixed(3)),[0,.2,.02]);
 const h=world(a.joints.head).sub(world(a.joints.neck0));
 assert.deepEqual([h.x,h.y,h.z].map(v=>+v.toFixed(3)),[0,.19,.27].map(v=>+(v*(a.g.scale.x)).toFixed(3)));
});
