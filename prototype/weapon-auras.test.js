import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {weaponAuraStyle,weaponAuraKey,syncWeaponAura} from './weapon-auras.js';
import {updateStepOver,STEP_DURATION} from './step-over.js';

test('only a known positive enchantment on a weapon shows an edge-light',()=>{
 assert.equal(weaponAuraKey({class:2,spe:3}),3);
 assert.equal(weaponAuraKey({class:2,spe:12}),7);
 assert.equal(weaponAuraKey({class:2,spe:0}),null);
 assert.equal(weaponAuraKey({class:2,spe:-2}),null);
 assert.equal(weaponAuraKey({class:2}),null);
 assert.equal(weaponAuraKey({class:3,spe:3}),null);
 assert.equal(weaponAuraKey(null),null);
});

test('more enchantment means more, brighter, quicker glints',()=>{
 const a=weaponAuraStyle(1),b=weaponAuraStyle(7);
 assert(b.count>a.count&&b.alpha>a.alpha&&b.period<a.period);
});

test('the glint stays on the blade, finite and in bounds, and frees itself',()=>{
 for(const spe of [1,4,9]){
  const item=new THREE.Group(),aura=syncWeaponAura(item,{class:2,spe},'2,5');
  for(let t=0;t<12;t+=1/30){
   aura.userData.update(t);
   const pts=aura.children[0],pos=pts.geometry.attributes.position.array,alpha=pts.geometry.attributes.aAlpha.array,size=pts.geometry.attributes.aSize.array;
   for(let i=0;i<alpha.length;i++){
    for(const v of [pos[i*3],pos[i*3+1],pos[i*3+2],alpha[i],size[i]])assert(Number.isFinite(v));
    assert(Math.abs(pos[i*3])<=.17&&Math.abs(pos[i*3+2])<=.02&&pos[i*3+1]>=0&&pos[i*3+1]<=.05);
    assert(alpha[i]>=0&&alpha[i]<=1&&size[i]>=0&&size[i]<=.1);
   }
  }
  aura.userData.dispose();
 }
});

test('the effect follows what is lying there',()=>{
 const item=new THREE.Group();
 const a=syncWeaponAura(item,{class:2,spe:2},'1,1');
 assert.equal(syncWeaponAura(item,{class:2,spe:2},'1,1'),a);
 const b=syncWeaponAura(item,{class:2,spe:5},'1,1');
 assert.notEqual(a,b);
 assert.equal(item.children.length,1);
 assert.equal(syncWeaponAura(item,{class:2},'1,1'),null);
 assert.equal(item.children.length,0);
});

test('stepping on an enchanted weapon swells the edge-light and settles exactly to rest',()=>{
 const item=new THREE.Group(),aura=syncWeaponAura(item,{class:2,spe:3},'1,1');
 updateStepOver(item,true,.01);
 updateStepOver(item,true,STEP_DURATION/2);
 assert(aura.scale.x>1);
 updateStepOver(item,true,STEP_DURATION);
 assert.equal(aura.scale.x,1);
});
