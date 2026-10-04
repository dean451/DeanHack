import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSink} from './sink.js';

test('the sink is a rusty pipe and grate in the floor: finite, in its tile, merged per material, weathering baked',()=>{
 const sink=createSink();
 sink.updateMatrixWorld(true);
 const meshes=sink.children.filter(o=>o.isMesh);
 assert.equal(meshes.length,sink.children.length,'nothing but merged meshes');
 assert.equal(new Set(meshes.map(o=>o.material)).size,meshes.length,'one mesh per material');
 assert.deepEqual(meshes.map(o=>o.userData.part).sort(),['iron','stone','water']);
 for(const o of meshes)for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
 for(const part of ['iron','stone']){
  const col=meshes.find(o=>o.userData.part===part).geometry.attributes.color;
  assert(col,`${part} has baked colours`);
  for(const x of col.array)assert(x>=0&&x<=1.2,`${part} colour ${x}`);
 }
 const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);
 assert(bounds.min.y>=-.005,`sinks to ${bounds.min.y}`);
 assert(bounds.max.y>.55&&bounds.max.y<.7,`top at ${bounds.max.y}`);
 for(const k of ['x','z'])assert(bounds.min[k]>=-.46&&bounds.max[k]<=.46,`leaves its tile on ${k}`);
 let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
 sink.userData.dispose();assert.equal(disposed,meshes.length);
});
