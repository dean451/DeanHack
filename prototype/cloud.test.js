import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTerrainFeature} from './terrain-feature.js';

test('clouds are a merged, finite bank that fills its tile, replaces the floor and frees its resources',()=>{
 for(const seed of [0,1,7,42,123,999,2024,31337]){
  const t0=performance.now();
  const model=createTerrainFeature('cloud',seed);
  const ms=performance.now()-t0;
  assert(model.userData.hidesFloor,'a cloud tile should hide the stone slab');
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.5,'cloud leaves its tile');
  assert(bounds.min.y>-.42&&bounds.max.y<1,`cloud has a bad height ${bounds.min.y}..${bounds.max.y}`);
  const meshes=[],geometries=new Set(),materials=new Set(),counts={};
  let lo=1,hi=0;
  model.traverse(part=>{if(part.geometry){
   meshes.push(part);geometries.add(part.geometry);materials.add(part.material);
   counts[part.userData.part]=part.geometry.attributes.position.count;
   for(const key of ['position','normal','color'])for(const value of part.geometry.attributes[key].array)assert(Number.isFinite(value),`cloud has a bad ${key}`);
   for(const value of part.geometry.attributes.color.array){lo=Math.min(lo,value);hi=Math.max(hi,value);}
  }});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['bank','vapour']);
  assert(lo>=0&&hi<=1,'colours out of range');
  // The bank covers the whole tile, so no hole shows where the slab was hidden,
  // and its top stays near floor height so things can stand on it.
  const bank=meshes.find(m=>m.userData.part==='bank').geometry;bank.computeBoundingBox();
  const bb=bank.boundingBox;
  assert(bb.min.x<-.49&&bb.max.x>.49&&bb.min.z<-.49&&bb.max.z>.49,'bank should reach every tile edge');
  assert(bb.max.y>0&&bb.max.y<.14,`bank top ${bb.max.y} should be near floor height`);
  const pos=bank.attributes.position;let centre=-1;
  for(let i=0;i<pos.count;i++)if(Math.hypot(pos.getX(i),pos.getZ(i))<.08)centre=Math.max(centre,pos.getY(i));
  assert(centre>-.08,`bank should be solid under the middle (top ${centre})`);
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,'cloud leaks resources');
  console.log(`cloud ${seed}: ${JSON.stringify(counts)}, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, bank top ${bb.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}, colours ${lo.toFixed(3)}..${hi.toFixed(3)}, ${ms.toFixed(1)} ms`);
 }
});
