import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AMULET_AURAS,amuletAuraKind,syncAmuletAura,particleAt} from './amulet-auras.js';
import {scoopSwell} from './step-over.js';

test('amulet effects key on the true type; Yendor, unknown and other classes get none',()=>{
 assert.equal(amuletAuraKind({class:5,name:'life saving'}),'life saving');
 assert.equal(amuletAuraKind({class:5,name:'amulet of ESP'}),'ESP');
 assert.equal(amuletAuraKind({class:5,name:'amulet versus poison'}),'versus poison');
 assert.equal(amuletAuraKind({class:5,name:'Amulet of Yendor'}),null);
 assert.equal(amuletAuraKind({class:5,name:'circular amulet'}),null);
 assert.equal(amuletAuraKind({class:4,name:'life saving'}),null);
 assert.equal(amuletAuraKind(null),null);
});

test('every amulet effect stays finite and near its amulet, and frees itself',()=>{
 for(const kind of Object.keys(AMULET_AURAS)){
  const item=new THREE.Group(),aura=syncAmuletAura(item,{class:5,name:kind},'3,4');
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
 const a=syncAmuletAura(item,{class:5,name:'flying'},'1,1');
 assert.equal(syncAmuletAura(item,{class:5,name:'flying'},'1,1'),a);
 const b=syncAmuletAura(item,{class:5,name:'reflection'},'1,1');
 assert.notEqual(a,b);assert.equal(a.parent,null);
 assert.equal(syncAmuletAura(item,{class:5,name:'Amulet of Yendor'},'1,1'),null);
 assert.equal(item.userData.amuletAura,null);assert.equal(b.parent,null);
});

test('the heartbeat is two beats then a rest, and a pure function of life',()=>{
 const seed=[.2,.4,.6,.8];
 assert.deepEqual(particleAt('beat',seed,.3),particleAt('beat',seed,.3));
 assert(particleAt('beat',seed,.07).alpha>.9&&particleAt('beat',seed,.29).alpha>.3);
 assert.equal(particleAt('beat',seed,.7).alpha,0);
});

test('the pickup scoop swells an amulet aura once and settles exactly to rest',()=>{
 const item=new THREE.Group();syncAmuletAura(item,{class:5,name:'life saving'},'k');
 const aura=item.userData.amuletAura;let biggest=1;
 for(let u=0;u<=1;u+=1/60){scoopSwell(item,u);biggest=Math.max(biggest,aura.scale.x);}
 scoopSwell(item,1);
 assert(biggest>1.5);assert.equal(aura.scale.x,1);
});
