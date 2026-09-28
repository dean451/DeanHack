import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createShopItem} from './shop-visuals.js';

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
