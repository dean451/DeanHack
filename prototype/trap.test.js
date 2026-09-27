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

test('the web is solid silk geometry with a spider, not 1px lines',()=>{
 const model=createTrap('web',5);
 let lines=0,meshes=0,vertices=0;
 model.traverse(part=>{if(part.isLineSegments)lines++;if(part.isMesh){meshes++;vertices+=part.geometry.attributes.position.count;}});
 assert.equal(lines,0);
 assert(meshes<40,`web is ${meshes} meshes; static strands should be merged`);
 assert(vertices>2500,'web lost its strands');
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.max.y>.9&&bounds.min.y>=-.001);
 assert(vertices<12000,`web is ${vertices} vertices`);
 console.log(`web: ${meshes} meshes, ${vertices} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
});

test('static trap parts are merged: one draw call per material outside moving subgroups',()=>{
 for(const kind of KINDS){
  const model=createTrap(kind,2),seen=new Set();
  for(const part of model.children)if(part.isMesh){
   const key=`${part.material.uuid}:${part.castShadow}`;
   assert(!seen.has(key),`${kind} has two top-level meshes sharing a material`);seen.add(key);
  }
 }
});

test('the bear trap is one rusted, vertex-coloured mesh with teeth, springs and a staked chain',()=>{
 const model=createTrap('jaws',4);
 const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
 assert.equal(meshes.length,1);
 const [trap]=meshes,{position,color}=trap.geometry.attributes;
 assert(trap.material.vertexColors&&color,'bear trap should be vertex coloured');
 for(const value of color.array)assert(Number.isFinite(value)&&value>=0&&value<=1);
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.min.y>-.01&&bounds.max.y<.15,'bear trap should lie flat on the floor');
 assert(bounds.max.x-bounds.min.x>.8,'springs should reach out to both sides');
 assert(bounds.max.z>.4,'chain should run to a stake near the tile edge');
 console.log(`bear trap: ${position.count} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
});
