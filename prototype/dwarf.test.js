import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {DWARVES} from './dwarf.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('dwarves, dwarf lords and dwarf kings get their own model instead of the box humanoid',()=>{
 const tops={};
 for(const name of DWARVES){
  const a=createCreature({name,symbol:104,color:1});
  assert.equal(a.g.name,name);assert.equal(a.quirk,'dwarf');
  for(const key of ['body','head','arm','weaponSocket','beard'])assert(a[key]?.isObject3D,`${name} ${key}`);
  assert.equal(a.hat,null);
  assert.equal(a.legs.length,2);assert.equal(a.arms.length,2);assert.equal(a.arm,a.arms[1]);
  assert.equal(a.weaponSocket.parent,a.arm,'the weapon is in the right fist');
  assert.equal(a.beard.parent,a.head);
  // plain dwarves and lords carry the pick in the left hand; the king has a sceptre instead
  const pick=a.g.getObjectByName('dwarf-pick');
  assert.equal(Boolean(pick),name!=='dwarf king',name);assert.equal(a.pick??undefined,pick);
  const parts=meshes(a);
  assert(parts.length<=13,`${name}: ${parts.length} draws`);
  assert.equal(new Set(parts.map(m=>m.material)).size,2,'cloth and metal materials, shared');
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of at.color.array)assert(v>=0&&v<=1,`${name} ${m.userData.part} colour`);
  }
  assert(verts<60000,`${name}: ${verts} vertices`);
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>-.03&&b.min.y<.03,`${name}: feet at ${b.min.y}`);
  assert(b.max.x<.5&&b.max.z<.5&&b.min.z>-.5,`${name}: out of the tile`);
  // the gait swings the beard about the chin, .19 above its origin: that sits on the head
  const chin=a.beard.localToWorld(new THREE.Vector3(0,.19,0)),head=a.head.getWorldPosition(new THREE.Vector3());
  assert(chin.y<head.y&&chin.distanceTo(head)<.15,`${name}: beard at the chin`);
  // the beard falls to the belt, in front of the chest
  const beard=new THREE.Box3().setFromObject(a.beard);
  assert(beard.min.y<.55&&beard.max.z>.2,`${name}: beard ${beard.min.y} ${beard.max.z}`);
  if(pick){
   // held in the left fist: the grip is at the hand, the butt clears the floor, the head is
   // near head height
   const hand=a.arms[0].localToWorld(new THREE.Vector3(0,-.38,0)),grip=pick.getWorldPosition(new THREE.Vector3());
   assert(hand.distanceTo(grip)<.12,`${name}: pick in hand ${hand.distanceTo(grip)}`);
   const box=new THREE.Box3().setFromObject(pick);
   assert(box.min.y>0&&box.max.y<1.2&&box.min.x>-.85&&box.max.x<0,name);
  }
  const [l,r]=a.legs.map(leg=>new THREE.Box3().setFromObject(leg));
  assert(Math.abs((l.min.x+l.max.x)/2+(r.min.x+r.max.x)/2)<1e-6,`${name}: feet mirrored`);
  tops[name]=b.max.y;
  const again=meshes(createCreature({name}));
  parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry,'geometry shared'));
 }
 for(const [name,top] of Object.entries(tops))assert(top>1.1&&top<1.4,`${name} top ${top}`);
 assert(tops['dwarf king']>tops.dwarf,'the king stands taller');
 // an unlisted h still gets a dwarf; dwarf zombies and mummies keep their own models
 assert.equal(createCreature({name:'dwarf ancestor',symbol:104}).quirk,'dwarf');
 assert.notEqual(createCreature({name:'dwarf zombie'}).g.name,'dwarf');
 assert.notEqual(createCreature({name:'dwarf mummy'}).g.name,'dwarf');
});
