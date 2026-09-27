import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTrap,trapKind} from './trap.js';

const KINDS=['pit','hatch','jaws','mine','rubble','rust','fire','teleport','magic','polymorph','ice','portal','web','plate'];

test('magic portals get their own kind; teleporters keep the rune circle',()=>{
 assert.equal(trapKind(94,13),'portal');
 assert.equal(trapKind(94,5),'teleport');
 assert.equal(trapKind(94,8),'plate');
 assert.equal(trapKind(46,13),null);
});

test('every trap model is finite, stays in its tile and disposes its resources (rocks may sink into the slab)',()=>{
 for(const kind of KINDS){
  const model=createTrap(kind,7);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>=-.06,`${kind} sinks too far into the floor`);
  assert(bounds.max.y<=1.05,`${kind} is too tall`);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.5,`${kind} leaves its tile`);
  const geometries=new Set(),materials=new Set();
  model.traverse(part=>{if(part.geometry){
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),`${kind} has a bad vertex`);
   geometries.add(part.geometry);materials.add(part.material);
  }});
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,`${kind} leaks resources`);
 }
});

test('the portal is an upright arch around a glowing rift',()=>{
 const model=createTrap('portal',3);
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.max.y>.9);
 let glowing=0,vertices=0;
 model.traverse(part=>{if(part.geometry){vertices+=part.geometry.attributes.position.count;if(part.material.emissiveIntensity>=1&&part.material.emissive?.getHex())glowing++;}});
 assert(glowing>=8);
 console.log(`portal: ${vertices} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
});
