import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStairs} from './stairs.js';

test('stairs are finite, stay in their tile and merge into one mesh per material',()=>{
 for(const direction of ['up','down'])for(let seed=0;seed<12;seed++){
  const stairs=createStairs(direction,seed*131+seed*seed*7),count=direction==='up'?3:2;
  stairs.updateMatrixWorld(true);
  const meshes=stairs.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,stairs.children.length,'nothing but merged meshes');
  assert.equal(meshes.length,count,`${direction}: ${meshes.length} meshes`);
  assert.equal(new Set(meshes.map(o=>o.material)).size,count,'one mesh per material');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),direction==='up'?['glow','iron','stone']:['stone','void']);
  for(const o of meshes)for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  for(const part of direction==='up'?['stone','iron']:['stone'])assert(meshes.find(o=>o.userData.part===part).geometry.attributes.color,`${part} has baked colours`);
  const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);
  assert(bounds.min.y>=-.01,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y<(direction==='up'?1:.5),`top at ${bounds.max.y}`);
  for(const k of ['x','z'])assert(bounds.min[k]>=-.5&&bounds.max[k]<=.5,`leaves its tile on ${k}`);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  stairs.userData.dispose();assert.equal(disposed,meshes.length);
 }
});
