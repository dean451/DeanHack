import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTerrainFeature} from './terrain-feature.js';
import {SKY_Y} from './air.js';

test('open air is a flat sky plus one merged, fading drift that stays in its tile and frees its resources',()=>{
 for(const seed of [0,1,7,42,123,999,2024,31337]){
  const t0=performance.now();
  const model=createTerrainFeature('air',seed);
  const ms=performance.now()-t0;
  assert(model.userData.hidesFloor,'an air tile should hide the stone slab');
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.501,'air leaves its tile');
  assert(Math.abs(bounds.min.y-SKY_Y)<1e-6&&bounds.max.y<.6,`air has a bad height ${bounds.min.y}..${bounds.max.y}`);
  const meshes=[],geometries=new Set(),materials=new Set();
  model.traverse(part=>{if(part.geometry){meshes.push(part);geometries.add(part.geometry);materials.add(part.material);}});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['drift','sky']);
  const sky=meshes.find(m=>m.userData.part==='sky');
  assert(!sky.material.vertexColors,'the sky must be one flat colour so tiles join');
  const drift=meshes.find(m=>m.userData.part==='drift').geometry;
  const col=drift.attributes.color;
  assert.equal(col.itemSize,4,'drift colours should carry alpha');
  let lo=1,hi=0,alphaLo=1,alphaHi=0;
  for(const value of drift.attributes.position.array)assert(Number.isFinite(value),'drift has a bad position');
  for(let i=0;i<col.count;i++){
   for(let k=0;k<3;k++){const v=col.array[i*4+k];assert(Number.isFinite(v));lo=Math.min(lo,v);hi=Math.max(hi,v);}
   const a=col.array[i*4+3];assert(Number.isFinite(a));alphaLo=Math.min(alphaLo,a);alphaHi=Math.max(alphaHi,a);
  }
  assert(lo>=0&&hi<=1&&alphaLo>=0&&alphaHi<=.6,'colours out of range');
  assert(alphaLo<.02,'edges should fade out');
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,'air leaks resources');
  console.log(`air ${seed}: ${drift.attributes.position.count} drift verts, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}, rgb ${lo.toFixed(2)}..${hi.toFixed(2)}, alpha ${alphaLo.toFixed(2)}..${alphaHi.toFixed(2)}, ${ms.toFixed(1)} ms`);
 }
});

test('a magic platform is a floating, faceted slab over the open-air sky, in two draws',async()=>{
 const {featureKind}=await import('./terrain-feature.js');
 const {PLATFORM_TOP}=await import('./magic-platform.js');
 assert.equal(featureKind(46,7),'magic-platform');
 assert.equal(featureKind(46,6),'ice');
 for(const seed of [0,1,7,42,123,999,2024,31337]){
  const model=createTerrainFeature('magic-platform',seed);
  assert(model.userData.hidesFloor,'a platform replaces the floor slab');
  const meshes=[],geometries=new Set(),materials=new Set();
  model.traverse(part=>{if(part.geometry){meshes.push(part);geometries.add(part.geometry);materials.add(part.material);}});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['glow','stone']);
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.501,'the platform leaves its tile');
  assert(Math.abs(bounds.min.y-SKY_Y)<1e-6,'the sky should lie at the open-air height');
  const rock=meshes.find(m=>m.userData.part==='stone').geometry,glow=meshes.find(m=>m.userData.part==='glow').geometry;
  const rb=new THREE.Box3().setFromBufferAttribute(rock.attributes.position);
  assert(rb.min.y>SKY_Y+.005,`the keel pokes through the sky at ${rb.min.y}`);
  assert(rb.max.y<=PLATFORM_TOP+.002&&rb.max.y>PLATFORM_TOP-.005,`the top (and its scorched grooves) should sit at the floor height, got ${rb.max.y}`);
  assert(Math.abs(rb.max.x)<.47&&Math.abs(rb.min.z)<.47,'the slab should leave a gap at the tile edge');
  for(const geo of [rock,glow]){
   for(const key of ['position','color'])for(const value of geo.attributes[key].array)assert(Number.isFinite(value),`bad ${key}`);
   for(const value of geo.attributes.color.array)assert(value>=0&&value<=1.3,'colour out of range');
  }
  for(const value of rock.attributes.normal.array)assert(Number.isFinite(value),'bad normal');
  // The runes glow just above the top, inside the slab.
  const gp=glow.attributes.position;let runes=0;
  for(let i=0;i<gp.count;i++){const y=gp.getY(i);if(y>PLATFORM_TOP){runes++;assert(Math.hypot(gp.getX(i),gp.getZ(i))<.34,'a rune leaves the slab');assert(y<PLATFORM_TOP+.006);}}
  assert(runes>200,'there should be a ring of runes on top');
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,'the platform leaks resources');
  console.log(`magic platform ${seed}: ${rock.attributes.position.count} stone + ${gp.count} glow verts, stone y ${rb.min.y.toFixed(3)}..${rb.max.y.toFixed(3)}, x ${rb.min.x.toFixed(3)}..${rb.max.x.toFixed(3)}, z ${rb.min.z.toFixed(3)}..${rb.max.z.toFixed(3)}`);
 }
});
