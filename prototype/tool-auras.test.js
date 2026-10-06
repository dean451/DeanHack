import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TOOL_AURAS,toolAuraKind,syncToolAura} from './tool-auras.js';

test('tool effects key on the true name; mundane tools, lamps and other classes get none',()=>{
 assert.equal(toolAuraKind({class:6,name:'bag of holding'}),'bag of holding');
 assert.equal(toolAuraKind({class:6,name:'a unicorn horn'}),'unicorn horn');
 assert.equal(toolAuraKind({class:6,name:'magic marker (0:42)'}),'magic marker');
 assert.equal(toolAuraKind({class:6,name:'sack'}),null);
 assert.equal(toolAuraKind({class:6,name:'magic lamp'}),null);
 assert.equal(toolAuraKind({class:4,name:'bag of holding'}),null);
 assert.equal(toolAuraKind(null),null);
});

test('every tool effect stays finite and near its tool, and frees itself',()=>{
 for(const kind of Object.keys(TOOL_AURAS)){
  const item=new THREE.Group(),aura=syncToolAura(item,{class:6,name:kind},'3,4');
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
 const a=syncToolAura(item,{class:6,name:'frost horn'},'1,1');
 assert.equal(syncToolAura(item,{class:6,name:'frost horn'},'1,1'),a);
 const b=syncToolAura(item,{class:6,name:'fire horn'},'1,1');
 assert.notEqual(a,b);assert.equal(a.parent,null);
 assert.equal(syncToolAura(item,{class:6,name:'sack'},'1,1'),null);
 assert.equal(item.userData.toolAura,null);assert.equal(b.parent,null);
});
