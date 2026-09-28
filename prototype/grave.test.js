import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGrave} from './grave.js';
import {createTree} from './tree.js';

test('graves are finite, stay in their tile, merge per material and vary their headstone by seed',()=>{
 const kinds=new Set();
 for(let seed=0;seed<40;seed++){
  const grave=createGrave(seed*31+seed*seed*17);
  grave.updateMatrixWorld(true);
  const meshes=grave.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,grave.children.length,'nothing but merged meshes');
  assert(meshes.length<=5,`${meshes.length} meshes`);
  assert.equal(new Set(meshes.map(o=>o.material)).size,meshes.length,'one mesh per material');
  for(const part of ['stone','earth','grass','wax','flame'])assert(meshes.some(o=>o.userData.part===part),`missing ${part}`);
  for(const o of meshes)for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  for(const part of ['stone','earth','grass'])assert(meshes.find(o=>o.userData.part===part).geometry.attributes.color,`${part} has baked colours`);
  const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);
  assert(bounds.min.y>=-.02,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y>.4&&bounds.max.y<.6,`top at ${bounds.max.y}`);
  for(const k of ['x','z'])assert(bounds.min[k]>=-.5&&bounds.max[k]<=.5,`leaves its tile on ${k}`);
  kinds.add(grave.userData.headstone);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  grave.userData.dispose();assert.equal(disposed,meshes.length);
 }
 assert.deepEqual([...kinds].sort(),['cross','gothic','round']);
});

test('trees are finite, stay in their tile and merge into bark, leaves and litter',()=>{
 for(let seed=0;seed<24;seed++){
  const tree=createTree(seed*97+seed*seed*13);
  tree.updateMatrixWorld(true);
  const meshes=tree.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,tree.children.length,'nothing but merged meshes');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),['bark','leaves','litter']);
  assert.equal(new Set(meshes.map(o=>o.material)).size,3,'one mesh per material');
  assert.equal(tree.userData.canopy?.userData.part,'leaves');
  for(const o of meshes){
   assert(o.geometry.attributes.color,`${o.userData.part} has baked colours`);
   for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  }
  const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);
  assert(bounds.min.y>=-.08,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y<1.45&&bounds.max.y>1.1,`top at ${bounds.max.y}`);
  for(const k of ['x','z'])assert(bounds.min[k]>=-.48&&bounds.max[k]<=.48,`leaves its tile on ${k}`);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  tree.userData.dispose();assert.equal(disposed,meshes.length);
 }
});
