import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {POTION_AURAS,potionAuraKind,syncPotionAura} from './potion-auras.js';

test('potion effects key on the true type; water, unknown and other classes get none',()=>{
 assert.equal(potionAuraKind({class:8,name:'healing'}),'healing');
 assert.equal(potionAuraKind({class:8,name:'2 potions of gain level'}),'gain level');
 assert.equal(potionAuraKind({class:8,name:'potion of extra healing'}),'extra healing');
 assert.equal(potionAuraKind({class:8,name:'water'}),null);
 assert.equal(potionAuraKind({class:8,name:'milky potion'}),null);
 assert.equal(potionAuraKind({class:4,name:'healing'}),null);
 assert.equal(potionAuraKind(null),null);
});

test('paralysis, invisibility, detection, polymorph, oil and the bloods have effects',()=>{
 for(const kind of ['paralysis','invisibility','monster detection','object detection','polymorph','oil','blood','vampire blood'])
  assert.equal(potionAuraKind({class:8,name:`potion of ${kind}`}),kind);
 assert.equal(POTION_AURAS.paralysis.count,1,'paralysis stays nearly still');
});

test('every potion effect stays finite and over its bottle, and frees itself',()=>{
 for(const kind of Object.keys(POTION_AURAS)){
  const item=new THREE.Group(),aura=syncPotionAura(item,{class:8,name:kind},'3,4');
  assert(aura,`${kind} has no effect`);
  for(let t=0;t<12;t+=1/30){
   aura.userData.update(t);
   aura.traverse(o=>{if(!o.isPoints)return;
    const pos=o.geometry.attributes.position.array,alpha=o.geometry.attributes.aAlpha.array,size=o.geometry.attributes.aSize.array;
    for(let i=0;i<alpha.length;i++){
     for(const v of [pos[i*3],pos[i*3+1],pos[i*3+2],alpha[i],size[i]])assert(Number.isFinite(v),`${kind} NaN`);
     assert(Math.hypot(pos[i*3],pos[i*3+2])<=.15&&pos[i*3+1]>=0&&pos[i*3+1]<=.6,`${kind} strays`);
     assert(alpha[i]>=0&&alpha[i]<=1&&size[i]>=0&&size[i]<=.2,`${kind} out of bounds`);
    }
   });
  }
  aura.userData.dispose();
 }
});

test('the effect follows what is lying there',()=>{
 const item=new THREE.Group();
 const a=syncPotionAura(item,{class:8,name:'sleeping'},'1,1');
 assert.equal(syncPotionAura(item,{class:8,name:'sleeping'},'1,1'),a);
 const b=syncPotionAura(item,{class:8,name:'acid'},'1,1');
 assert.notEqual(a,b);
 assert.equal(item.children.length,1);
 assert.equal(syncPotionAura(item,{class:8,name:'water'},'1,1'),null);
 assert.equal(item.children.length,0);
});
