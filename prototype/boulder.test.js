import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoulder} from './boulder.js';

test('boulders are finite, sit on the floor inside their tile, vary by seed and dispose their resources',()=>{
 const sizes=new Set();
 for(const seed of [1,7,42,1234567,4000000000]){
  const boulder=createBoulder(seed);
  boulder.updateMatrixWorld(true);
  let vertices=0;
  boulder.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;vertices+=p.count;for(const x of p.array)assert(Number.isFinite(x),`seed ${seed} has a non-finite vertex`);});
  assert(vertices>2000,`seed ${seed} is too coarse`);
  const bounds=new THREE.Box3().setFromObject(boulder);
  assert(bounds.min.y>=-.001,`seed ${seed} sinks into the floor`);
  assert(bounds.max.y>=.35&&bounds.max.y<=.65,`seed ${seed} is ${bounds.max.y.toFixed(3)} tall`);
  for(const k of ['x','z'])assert(bounds.min[k]>=-.5&&bounds.max[k]<=.5,`seed ${seed} leaves its tile on ${k}`);
  const mass=boulder.children.find(o=>o.userData.part==='mass');
  assert(mass.geometry.attributes.color,'the mass has baked vertex colours');
  mass.geometry.computeBoundingBox();sizes.add(mass.geometry.boundingBox.max.y.toFixed(4));
  let draws=0;boulder.traverse(o=>{if(o.isMesh)draws++;});
  assert.equal(draws,2,`seed ${seed} draws the stone and its shadow only`);
  const shadow=boulder.children.find(o=>o.userData.part==='shadow'),col=shadow.geometry.attributes.color;
  assert.equal(col.itemSize,4,'the shadow fades by vertex alpha');
  assert(col.getW(0)>.5&&col.getW(col.count-1)===0,'the shadow is dark at the centre and clear at the rim');
  let disposed=0;boulder.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));
  boulder.userData.dispose();assert(disposed>0);
 }
 assert(sizes.size>1,'the seed changes the shape');
});

test('live.js gives every boulder the one fixed seed, so a pushed boulder keeps its model',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('./live.js',import.meta.url),'utf8');
 assert(src.includes('createBoulder(BOULDER_SEED)'),'the boulder is built from BOULDER_SEED, not the tile');
 assert(!/createBoulder\(cellHash/.test(src),'the boulder seed must not depend on its tile');
});
