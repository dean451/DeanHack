import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createShopItem,createLightItem} from './shop-visuals.js';

test('pick-axe and broad pick lie flat on the floor with finite, disposable geometry',()=>{
 for(const name of ['pick-axe','a +0 pick-axe (weapon in hand)','broad pick','dwarvish mattock','crystal pick']){
  const model=createShopItem(name);
  assert(model,name);assert(model.userData.restingWeapon);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y<.16,`${name} lies flat`);
  assert(bounds.max.x-bounds.min.x>.6,`${name} keeps a long haft`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.55,`${name} stays on its tile`);
  const geometries=new Set(),materials=new Set();
  model.traverse(part=>{if(part.geometry){
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   geometries.add(part.geometry);materials.add(part.material);
  }});
  assert(geometries.size>10,'head, haft, grip, langets and wedge are separate parts');
  let disposed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>disposed++);
  model.userData.dispose();
  assert.equal(disposed,geometries.size+materials.size);
 }
 const height=name=>new THREE.Box3().setFromObject(createShopItem(name),true).max.y;
 assert(height('broad pick')>height('pick-axe'),'the mattock stands on its adze blade');
 const crystal=createShopItem('crystal pick');let glassy=false;
 crystal.traverse(part=>{if(part.material?.transparent&&part.geometry.attributes.color){glassy=true;
  for(const v of part.geometry.attributes.color.array)assert(v>=0&&v<=1,'crystal facet colours stay in range');}});
 assert(glassy,'the crystal pick has a translucent, facet-coloured head');
 assert(createShopItem('lock pick'));assert.equal(createShopItem('pickle'),null);
});

test('skeleton key lies flat as one merged, vertex-coloured mesh',()=>{
 for(const name of ['skeleton key','2 skeleton keys','an uncursed skeleton key']){
  const model=createShopItem(name);
  assert(model,name);assert(model.userData.restingWeapon);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y<.04,`${name} lies flat`);
  assert(Math.max(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)>.35,`${name} reads as a long key`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} stays on its tile`);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.equal(meshes.length,1,'one draw');
  const geo=meshes[0].geometry;
  for(const value of geo.attributes.position.array)assert(Number.isFinite(value));
  for(const value of geo.attributes.normal.array)assert(Number.isFinite(value));
  for(const value of geo.attributes.color.array)assert(value>=0&&value<=1);
  let disposed=0;geo.addEventListener('dispose',()=>disposed++);meshes[0].material.addEventListener('dispose',()=>disposed++);
  model.userData.dispose();assert.equal(disposed,2);
 }
});

test('lock pick lies flat as one merged, vertex-coloured set',()=>{
 for(const name of ['lock pick','an uncursed lock pick']){
  const model=createShopItem(name);
  assert(model,name);assert(model.userData.restingWeapon);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y<.02,`${name} lies flat`);
  assert(Math.max(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)>.3,`${name} keeps long picks`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} stays on its tile`);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.equal(meshes.length,1,'one draw');
  const geo=meshes[0].geometry;
  for(const key of ['position','normal'])for(const value of geo.attributes[key].array)assert(Number.isFinite(value));
  for(const value of geo.attributes.color.array)assert(value>=0&&value<=1);
  let disposed=0;geo.addEventListener('dispose',()=>disposed++);meshes[0].material.addEventListener('dispose',()=>disposed++);
  model.userData.dispose();assert.equal(disposed,2);
 }
});

test('can of grease stands open in two merged, vertex-coloured meshes with its lid beside it',()=>{
 for(const name of ['can of grease','an uncursed can of grease (0:12)']){
  const model=createShopItem(name);
  assert(model,name);assert(model.userData.restingWeapon);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y>.18&&bounds.max.y<.22,`${name} stands as a short can`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} stays on its tile`);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.userData.part),['tin','grease'],'two draws');
  let disposed=0;
  for(const m of meshes){const geo=m.geometry;
   for(const key of ['position','normal'])for(const value of geo.attributes[key].array)assert(Number.isFinite(value));
   for(const value of geo.attributes.color.array)assert(value>=0&&value<=1);
   geo.addEventListener('dispose',()=>disposed++);m.material.addEventListener('dispose',()=>disposed++);}
  model.userData.dispose();assert.equal(disposed,4);
 }
});

test('brass lantern stands as a merged brass mesh and a glass globe, with a flame only when lit',()=>{
 for(const [name,lit] of [['brass lantern',false],['an uncursed brass lantern (lit)',true],['2 brass lanterns',false]]){
  const model=createLightItem(name);
  assert(model,name);assert(model.userData.restingWeapon);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} stands on the floor`);
  assert(bounds.max.y>.45&&bounds.max.y<.6,`${name} stands lantern-high`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} stays on its tile`);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.userData.part),lit?['brass','globe','flame']:['brass','globe']);
  let disposed=0;
  for(const m of meshes){const geo=m.geometry;
   for(const key of ['position','normal'])for(const value of geo.attributes[key].array)assert(Number.isFinite(value));
   for(const value of geo.attributes.color.array)assert(value>=0&&value<=1);
   geo.addEventListener('dispose',()=>disposed++);m.material.addEventListener('dispose',()=>disposed++);}
  model.userData.dispose();assert.equal(disposed,meshes.length*2);
 }
 assert(createLightItem('oil lamp'),'lamps keep their light-item model');assert(createLightItem('wax candle'));
});

test('candle stands in a brass chamberstick as two merged meshes, with a flame only when lit',()=>{
 const vertices=name=>{let n=0;createLightItem(name).traverse(part=>{if(part.isMesh&&part.userData.part==='wax')n=part.geometry.attributes.position.count;});return n;};
 for(const [name,lit] of [['wax candle',false],['a blessed tallow candle (lit)',true],['3 wax candles',false],['2 tallow candles (lit)',true]]){
  const model=createLightItem(name);
  assert(model,name);assert(model.userData.restingWeapon);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} stands on the floor`);
  assert(bounds.max.y>.36&&bounds.max.y<.5,`${name} stands candle-high`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} stays on its tile`);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.userData.part),lit?['brass','wax','flame']:['brass','wax']);
  let disposed=0;
  for(const m of meshes){const geo=m.geometry;
   for(const key of ['position','normal'])for(const value of geo.attributes[key].array)assert(Number.isFinite(value));
   for(const value of geo.attributes.color.array)assert(value>=0&&value<=1);
   geo.addEventListener('dispose',()=>disposed++);m.material.addEventListener('dispose',()=>disposed++);}
  model.userData.dispose();assert.equal(disposed,meshes.length*2);
 }
 assert(vertices('3 wax candles')>vertices('wax candle'),'a stack lays spare candles beside the stick');
 assert(vertices('tallow candle')>vertices('wax candle'),'tallow runs with more drips');
});
