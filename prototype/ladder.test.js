import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLadder,ladderShown,LADDER_COLOR} from './ladder.js';

test('ladders are finite, stay in their tile and merge into one mesh per material',()=>{
 for(const direction of ['up','down'])for(let seed=0;seed<12;seed++){
  const ladder=createLadder(direction,seed*131+seed*seed*7);
  ladder.updateMatrixWorld(true);
  const meshes=ladder.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,ladder.children.length,'nothing but merged meshes');
  assert.equal(meshes.length,4,`${direction}: ${meshes.length} meshes`);
  assert.equal(new Set(meshes.map(o=>o.material)).size,4,'one mesh per material');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),direction==='up'?['glow','iron','stone','wood']:['iron','stone','void','wood']);
  for(const o of meshes)for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  for(const part of ['stone','wood','iron'])assert(meshes.find(o=>o.userData.part===part).geometry.attributes.color,`${part} has baked colours`);
  const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);
  // A down ladder's foot sinks under the floor slab, below the black of the pit.
  assert(bounds.min.y>=(direction==='up'?-.02:-.06),`sinks to ${bounds.min.y}`);
  assert(bounds.max.y<(direction==='up'?1:.4),`top at ${bounds.max.y}`);
  if(direction==='up')assert(bounds.max.y>.85,'the up ladder stands tall');
  for(const k of ['x','z'])assert(bounds.min[k]>=-.5&&bounds.max[k]<=.5,`leaves its tile on ${k}`);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  ladder.userData.dispose();assert.equal(disposed,meshes.length);
 }
});

test('the ladder glyph is told from stairs by its colour, only while it is showing',()=>{
 assert.equal(ladderShown({kind:'terrain',color:LADDER_COLOR}),true);
 assert.equal(ladderShown({kind:'terrain',color:15}),false);
 assert.equal(ladderShown({kind:'monster',color:LADDER_COLOR}),null);
 assert.equal(ladderShown({kind:'object',color:7}),null);
});
