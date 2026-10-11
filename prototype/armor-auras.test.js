import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARMOR_AURAS,armorAuraKind,syncArmorAura} from './armor-auras.js';

test('armour effects key on the true name; mundane armour and other classes get none',()=>{
 assert.equal(armorAuraKind({class:3,name:'speed boots'}),'speed boots');
 assert.equal(armorAuraKind({class:3,name:'a pair of speed boots'}),null);
 assert.equal(armorAuraKind({class:3,name:'blessed +2 cloak of protection (being worn)'}),'cloak of protection');
 assert.equal(armorAuraKind({class:3,name:'uncursed shield of reflection'}),'shield of reflection');
 assert.equal(armorAuraKind({class:3,name:'plate mail'}),null);
 assert.equal(armorAuraKind({class:3,name:'crystal plate mail'}),null);
 assert.equal(armorAuraKind({class:6,name:'speed boots'}),null);
 assert.equal(armorAuraKind(null),null);
});

test('every armour effect stays finite and near its armour, and frees itself',()=>{
 for(const kind of Object.keys(ARMOR_AURAS)){
  const item=new THREE.Group(),aura=syncArmorAura(item,{class:3,name:kind},'3,4');
  assert(aura,`${kind} has no effect`);
  for(let t=0;t<12;t+=1/30){
   aura.userData.update(t);
   aura.traverse(o=>{if(!o.isPoints)return;
    const pos=o.geometry.attributes.position.array,alpha=o.geometry.attributes.aAlpha.array,size=o.geometry.attributes.aSize.array;
    for(let i=0;i<alpha.length;i++){
     for(const v of [pos[i*3],pos[i*3+1],pos[i*3+2],alpha[i],size[i]])assert(Number.isFinite(v),`${kind} NaN`);
     assert(Math.hypot(pos[i*3],pos[i*3+2])<=.2&&pos[i*3+1]>=0&&pos[i*3+1]<=.25,`${kind} strays`);
     assert(alpha[i]>=0&&alpha[i]<=1&&size[i]>=0&&size[i]<=.2,`${kind} out of bounds`);
    }
   });
  }
  aura.userData.dispose();
 }
});

test('the effect follows what is lying there',()=>{
 const item=new THREE.Group();
 const a=syncArmorAura(item,{class:3,name:'speed boots'},'1,1');
 assert.equal(syncArmorAura(item,{class:3,name:'speed boots'},'1,1'),a);
 const b=syncArmorAura(item,{class:3,name:'elven boots'},'1,1');
 assert.notEqual(a,b);assert.equal(a.parent,null);
 assert.equal(syncArmorAura(item,{class:3,name:'plate mail'},'1,1'),null);
 assert.equal(item.userData.armorAura,null);assert.equal(b.parent,null);
});
