import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTerrainFeature} from './terrain-feature.js';

test('floor ice is a merged, flat, finite model that stays in its tile and frees its resources',()=>{
 for(const seed of [0,1,7,42,123,999,2024,31337]){
  const t0=performance.now();
  const model=createTerrainFeature('ice',seed);
  const ms=performance.now()-t0;
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.5,'floor ice leaves its tile');
  assert(bounds.min.y>-1e-5&&bounds.max.y<.06,`floor ice has a bad height ${bounds.min.y}..${bounds.max.y}`);
  const meshes=[],geometries=new Set(),materials=new Set(),counts={};
  let lo=1,hi=0;
  model.traverse(part=>{if(part.geometry){
   meshes.push(part);geometries.add(part.geometry);materials.add(part.material);
   counts[part.userData.part]=part.geometry.attributes.position.count;
   for(const key of ['position','normal','color'])for(const value of part.geometry.attributes[key].array)assert(Number.isFinite(value),`floor ice has a bad ${key}`);
   for(const value of part.geometry.attributes.color.array){lo=Math.min(lo,value);hi=Math.max(hi,value);}
  }});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['frost','ice']);
  assert(lo>=0&&hi<=1,'colours out of range');
  // Frost and fractures must sit inside the tile too, not just the sheet.
  const frost=meshes.find(m=>m.userData.part==='frost').geometry;frost.computeBoundingBox();
  assert(frost.boundingBox.max.x<=.48&&frost.boundingBox.min.x>=-.48&&frost.boundingBox.max.z<=.48&&frost.boundingBox.min.z>=-.48,'frost leaves the sheet');
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,'floor ice leaks resources');
  console.log(`ice ${seed}: ${JSON.stringify(counts)}, y ${bounds.min.y.toFixed(4)}..${bounds.max.y.toFixed(4)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}, colours ${lo.toFixed(3)}..${hi.toFixed(3)}, ${ms.toFixed(1)} ms`);
 }
});
