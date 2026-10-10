import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPotion,potionShape} from './potion.js';
import {createGroundModel} from './ground-models.js';

const finite=model=>model.traverse(o=>{if(o.geometry)for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));});

test('every potion look gets a grounded, finite bottle in three draws, plus a floor glow when it is coloured',()=>{
 const looks=['ruby','milky','bubbly','clear','dark','smoky','icy','sparkling','',undefined];
 const shapes=new Set();
 for(const appearance of looks)for(const color of [1,8,15]){
  const model=createPotion({appearance,color});finite(model);
  shapes.add(model.userData.shape);
  assert.deepEqual(model.children.map(o=>o.name).filter(n=>n!=='glow'),['liquid','stopper','glass']);
  assert(model.children.length<=4);
  model.updateMatrixWorld(true);const b=new THREE.Box3();for(const o of model.children)if(o.name!=='glow')b.union(new THREE.Box3().setFromObject(o));
  assert(Math.abs(b.min.y)<1e-6,`${appearance} rests on the floor`);
  assert(b.max.y>.2&&b.max.y<.5,`${appearance} height ${b.max.y}`);
  assert(Math.max(b.max.x,-b.min.x,b.max.z,-b.min.z)<.45);
  model.userData.dispose();
 }
 assert.equal(shapes.size,4,'the shuffled looks use every bottle shape');
});

test('the bottle shape follows the look, not the true type',()=>{
 assert.equal(potionShape('ruby',1),potionShape('ruby',4));
 assert.equal(potionShape('',3),potionShape('',3));
 const a=createGroundModel({name:'healing',class:8,color:1,appearance:'ruby'});
 const b=createGroundModel({name:'gain level',class:8,color:1,appearance:'ruby'});
 const sig=m=>m.children.map(o=>o.geometry.attributes.position.count);
 assert.deepEqual(sig(a),sig(b));
 a.userData.dispose();b.userData.dispose();
});

test('the liquid sits inside the glass and a stack shows up to three bottles',()=>{
 const one=createPotion({appearance:'ruby'}),three=createPotion({appearance:'ruby',count:7});
 const count=(m,name)=>m.children.find(o=>o.name===name).geometry.attributes.position.count;
 assert.equal(count(three,'glass'),count(one,'glass')*3);
 const glass=new THREE.Box3().setFromObject(one.children.find(o=>o.name==='glass'));
 const liquid=new THREE.Box3().setFromObject(one.children.find(o=>o.name==='liquid'));
 assert(glass.containsBox(liquid));
 one.userData.dispose();three.userData.dispose();
});

test('ground potions release every geometry and material',()=>{
 const model=createGroundModel({name:'2 potions of sleeping',class:8,color:5});
 let geometries=0,materials=0;const mats=new Set();
 model.traverse(o=>{if(o.geometry){o.geometry.addEventListener('dispose',()=>geometries++);mats.add(o.material);}});
 for(const m of mats)m.addEventListener('dispose',()=>materials++);
 model.userData.dispose();
 assert(geometries>=3&&geometries<=4);assert.equal(geometries,materials);
});
