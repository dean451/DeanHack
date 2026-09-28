import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTerrainFeature} from './terrain-feature.js';

test('ice and crystal walls are merged, finite models that stay in their tile and free their resources',()=>{
 for(const [kind,parts] of [['ice-wall',['ice','snow']],['crystal-wall',['crystal','rock']]])for(const seed of [0,1,7,42,123,999]){
  const t0=performance.now();
  const model=createTerrainFeature(kind,seed);
  const ms=performance.now()-t0;
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.5,`${kind} leaves its tile`);
  assert(bounds.min.y>-1e-6&&bounds.max.y<1.05,`${kind} has a bad height ${bounds.min.y}..${bounds.max.y}`);
  assert(bounds.max.y>.6,`${kind} should stand up like a wall`);
  const meshes=[],geometries=new Set(),materials=new Set(),counts={};
  let lo=1,hi=0;
  model.traverse(part=>{if(part.geometry){
   meshes.push(part);geometries.add(part.geometry);materials.add(part.material);
   counts[part.userData.part]=part.geometry.attributes.position.count;
   for(const key of ['position','normal','color'])for(const value of part.geometry.attributes[key].array)assert(Number.isFinite(value),`${kind} has a bad ${key}`);
   for(const value of part.geometry.attributes.color.array){lo=Math.min(lo,value);hi=Math.max(hi,value);}
  }});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),parts);
  assert(lo>=0&&hi<=1,'colours out of range');
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,`${kind} leaks resources`);
  console.log(`${kind} ${seed}: ${JSON.stringify(counts)}, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}, colours ${lo.toFixed(3)}..${hi.toFixed(3)}, ${ms.toFixed(1)} ms`);
 }
});
