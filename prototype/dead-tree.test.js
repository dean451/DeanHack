import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDeadTree,deadTreeShown,DEAD_TREE_COLOR} from './dead-tree.js';

test('dead trees are finite, leafless, stay in their tile and merge into one mesh per material',()=>{
 for(let seed=0;seed<16;seed++){
  const tree=createDeadTree(seed*97+seed*seed*13);
  tree.updateMatrixWorld(true);
  const meshes=tree.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,tree.children.length,'nothing but merged meshes');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),['bark','litter']);
  assert.equal(new Set(meshes.map(o=>o.material)).size,2,'one mesh per material');
  for(const o of meshes){
   for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
   assert(o.geometry.attributes.color,`${o.userData.part} has baked colours`);
  }
  assert(tree.userData.tips>=8,`only ${tree.userData.tips} clawed tips`);
  const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);
  assert(bounds.min.y>=-.08,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y>.95&&bounds.max.y<1.45,`top at ${bounds.max.y}`);
  for(const k of ['x','z'])assert(bounds.min[k]>=-.5&&bounds.max[k]<=.5,`leaves its tile on ${k}: ${bounds.min[k]} ${bounds.max[k]}`);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  tree.userData.dispose();assert.equal(disposed,meshes.length);
 }
});

test('a dead tree is told from a live one by the black tree glyph, only while it is showing',()=>{
 assert.equal(deadTreeShown({kind:'terrain',symbol:35,color:DEAD_TREE_COLOR}),true);
 assert.equal(deadTreeShown({kind:'terrain',symbol:35,color:2}),false);
 assert.equal(deadTreeShown({kind:'terrain',symbol:73,color:8}),null,'the remembered I');
 assert.equal(deadTreeShown({kind:'object',symbol:35,color:0}),null);
 assert.equal(deadTreeShown({kind:'monster',symbol:100,color:0}),null);
});
