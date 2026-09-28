import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBars} from './bars.js';

test('iron bars are finite, stay in their tile, merge into iron and stone and bend one upright by seed',()=>{
 const bent=new Set();
 for(let seed=0;seed<30;seed++){
  const bars=createBars(seed*53+seed*seed*29);
  bars.updateMatrixWorld(true);
  const meshes=bars.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,bars.children.length,'nothing but merged meshes');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),['iron','stone']);
  assert.equal(new Set(meshes.map(o=>o.material)).size,2,'one mesh per material');
  for(const o of meshes){
   assert(o.geometry.attributes.color,`${o.userData.part} has baked colours`);
   for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  }
  const bounds=new THREE.Box3().setFromObject(bars);
  assert(bounds.min.y>=-.01,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y>.95&&bounds.max.y<1.06,`top at ${bounds.max.y}`);
  assert(bounds.min.x>=-.5&&bounds.max.x<=.5,'leaves its tile on x');
  assert(bounds.min.z>=-.12&&bounds.max.z<=.12,'too deep for a grille');
  bent.add(bars.userData.bent);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  bars.userData.dispose();assert.equal(disposed,meshes.length);
 }
 assert(bent.size>=4,`only bends uprights ${[...bent]}`);
});

// The door shares this file because package.json is held by another open PR.
test('doors are finite, stay in their tile, merge into wood, iron and stone and vary their planks by seed',async()=>{
 const {createDoor}=await import('./door.js');
 const planks=new Set();
 for(let seed=0;seed<20;seed++){
  const door=createDoor(seed*61+seed*seed*37);
  door.updateMatrixWorld(true);
  const meshes=door.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,door.children.length,'nothing but merged meshes');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),['iron','stone','wood']);
  assert.equal(new Set(meshes.map(o=>o.material)).size,3,'one mesh per material');
  for(const o of meshes){
   assert(o.geometry.attributes.color,`${o.userData.part} has baked colours`);
   for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  }
  const bounds=new THREE.Box3().setFromObject(door);
  assert(bounds.min.y>=-.01,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y>1&&bounds.max.y<1.15,`top at ${bounds.max.y}`);
  assert(bounds.min.x>=-.5&&bounds.max.x<=.5,'leaves its tile on x');
  assert(bounds.min.z>=-.14&&bounds.max.z<=.14,'too deep for a door frame');
  planks.add(door.userData.planks);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  door.userData.dispose();assert.equal(disposed,meshes.length);
 }
 assert.deepEqual([...planks].sort(),[5,6]);
});
