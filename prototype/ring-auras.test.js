import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';
import {RING_AURAS,ringAuraKind,syncRingAura,particleAt} from './ring-auras.js';

const ringItem=name=>{const item=new THREE.Group();item.add(createGroundModel({class:4,name,appearance:'jade'}));return item;};

test('ring effects key on the true ring type; unknown rings and other classes get none',()=>{
 assert.equal(ringAuraKind({class:4,name:'regeneration'}),'regeneration');
 assert.equal(ringAuraKind({class:4,name:'ring of fire resistance'}),'fire resistance');
 assert.equal(ringAuraKind({class:4,name:'ring of nonsense'}),null);
 assert.equal(ringAuraKind({class:5,name:'regeneration'}),null);
 assert.equal(ringAuraKind(null),null);
});

test('the later ring types have effects too',()=>{
 for(const k of ['gain intelligence','gain wisdom','gain dexterity','adornment','free action','polymorph','polymorph control','teleport control','see invisible','protection from shape changers'])assert.equal(ringAuraKind({class:4,name:`ring of ${k}`}),k);
});

test('every ring effect stays finite, tiny and near its ring, and frees itself',()=>{
 for(const kind of Object.keys(RING_AURAS)){
  const item=ringItem(kind),aura=syncRingAura(item,{class:4,name:kind},'3,4');
  assert(aura,`${kind} has no effect`);
  for(let t=0;t<12;t+=1/30){
   aura.userData.update(t);
   aura.traverse(o=>{if(!o.isPoints)return;
    const pos=o.geometry.attributes.position.array,alpha=o.geometry.attributes.aAlpha.array,size=o.geometry.attributes.aSize.array;
    for(let i=0;i<alpha.length;i++){
     for(const v of [pos[i*3],pos[i*3+1],pos[i*3+2],alpha[i],size[i]])assert(Number.isFinite(v),`${kind} NaN`);
     assert(Math.hypot(pos[i*3],pos[i*3+2])<=.2&&pos[i*3+1]>=0&&pos[i*3+1]<=.25,`${kind} strays from its ring`);
     assert(alpha[i]>=0&&alpha[i]<=1&&size[i]>=0&&size[i]<=.2,`${kind} out of bounds`);
    }
   });
  }
  aura.userData.dispose();
 }
});

test('the effect follows what is lying there: swapped, removed and unchanged',()=>{
 const item=ringItem('hunger');
 const a=syncRingAura(item,{class:4,name:'hunger'},'1,1');
 assert.equal(syncRingAura(item,{class:4,name:'hunger'},'1,1'),a);
 const b=syncRingAura(item,{class:4,name:'conflict'},'1,1');
 assert.notEqual(a,b);assert.equal(a.parent,null);
 assert.equal(syncRingAura(item,{class:4,name:'ring of nonsense'},'1,1'),null);
 assert.equal(item.userData.ringAura,null);
 assert.equal(b.parent,null);
});

test('a particle is a pure function of life, and the unknown motion is invisible',()=>{
 const seed=[.2,.4,.6,.8];
 for(const m of ['orbit','pulse','rise','spark','blink','gnaw'])assert.deepEqual(particleAt(m,seed,.37),particleAt(m,seed,.37));
 assert.equal(particleAt('nope',seed,.5).alpha,0);
});
