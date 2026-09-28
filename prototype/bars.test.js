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

// The torch sconce shares this file because package.json is held by another open PR.
test('torch sconces are finite, sit on the wall top, merge into wood and iron and put the flame on the torch',async()=>{
 const {createTorchSconce,WALL_TOP,TORCH_FLAME_Y}=await import('./torch.js');
 const prongs=new Set();
 for(let seed=0;seed<40;seed++){
  const sconce=createTorchSconce(seed*43+seed*seed*71);
  sconce.updateMatrixWorld(true);
  const meshes=sconce.children.filter(o=>o.isMesh);
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['iron','wood']);
  const box=new THREE.Box3().setFromObject(sconce);
  for(const mesh of meshes){
   for(const name of ['position','normal','color']){
    const a=mesh.geometry.attributes[name];assert.ok(a,`${name} present`);
    for(const value of a.array)assert.ok(Number.isFinite(value),`${name} finite`);
   }
   for(const value of mesh.geometry.attributes.color.array)assert.ok(value>=0&&value<=1);
  }
  assert.ok(box.min.y>=WALL_TOP-.002&&box.max.y<1,`y ${box.min.y}..${box.max.y}`);
  assert.ok(Math.max(-box.min.x,box.max.x,-box.min.z,box.max.z)<.13,'stays near the tile centre');
  const flame=sconce.userData.flame;
  assert.ok(Math.abs(flame.y-TORCH_FLAME_Y)<.01&&Math.hypot(flame.x,flame.z)<.02);
  prongs.add(sconce.userData.prongs);
  sconce.userData.dispose();
 }
 assert.ok(prongs.size>1,'the prong count varies by seed');
});
