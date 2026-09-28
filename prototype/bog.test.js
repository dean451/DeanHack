import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTerrainFeature} from './terrain-feature.js';

test('bogs are merged, finite models that stay in their tile and free their resources',()=>{
 for(const seed of [0,1,7,42,123,999]){
  const t0=performance.now();
  const model=createTerrainFeature('bog',seed);
  const ms=performance.now()-t0;
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.5,'bog leaves its tile');
  assert(bounds.min.y>-1e-6&&bounds.max.y<.7,`bog has a bad height ${bounds.min.y}..${bounds.max.y}`);
  assert(bounds.max.y>.25,'reeds should stand up out of the mud');
  const meshes=[],geometries=new Set(),materials=new Set(),counts={};
  let lo=1,hi=0;
  model.traverse(part=>{if(part.geometry){
   meshes.push(part);geometries.add(part.geometry);materials.add(part.material);
   counts[part.userData.part]=part.geometry.attributes.position.count;
   for(const key of ['position','normal','color'])for(const value of part.geometry.attributes[key].array)assert(Number.isFinite(value),`bog has a bad ${key}`);
   for(const value of part.geometry.attributes.color.array){lo=Math.min(lo,value);hi=Math.max(hi,value);}
  }});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['mud','plants','water']);
  assert(lo>=0&&hi<=1,'colours out of range');
  // The mud bed meets the floor at the tile edge.
  const mud=meshes.find(m=>m.userData.part==='mud').geometry.attributes.position;
  for(let i=0;i<mud.count;i++)if(Math.max(Math.abs(mud.getX(i)),Math.abs(mud.getZ(i)))>.485)assert(mud.getY(i)<.008,'mud edge should be at floor height');
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,'bog leaks resources');
  console.log(`bog ${seed}: ${JSON.stringify(counts)}, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}, colours ${lo.toFixed(3)}..${hi.toFixed(3)}, ${ms.toFixed(1)} ms`);
 }
});
