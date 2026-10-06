import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundModel} from './ground-models.js';

const part=(m,name)=>m.children.find(o=>o.name===name);
const make=name=>createGroundModel({name,class:8,color:1,appearance:'ruby'});

test('paralysis sets the liquid solid and dull',()=>{
 const plain=make('healing'),still=make('potion of paralysis');
 const l=part(still,'liquid').material;
 assert.equal(still.userData.twist,'paralysis');
 assert.equal(l.emissiveIntensity,0);
 assert(l.roughness>part(plain,'liquid').material.roughness);
 assert.equal(l.transparent,false);
 plain.userData.dispose();still.userData.dispose();
});

test('invisibility fades the liquid and the glass',()=>{
 const plain=make('healing'),faint=make('2 potions of invisibility');
 assert.equal(faint.userData.twist,'invisibility');
 assert(part(faint,'liquid').material.opacity<.4);
 assert(part(faint,'glass').material.opacity<part(plain,'glass').material.opacity);
 plain.userData.dispose();faint.userData.dispose();
});

test('blood, vampire blood, oil and blindness change the liquid',()=>{
 const plain=make('healing');
 const base=part(plain,'liquid').material;
 for(const [name,kind] of [['potion of blood','blood'],['potion of vampire blood','vampire blood'],['potion of oil','oil'],['potion of blindness','blindness']]){
  const m=make(name);
  assert.equal(m.userData.twist,kind);
  const l=part(m,'liquid').material;
  assert.equal(l.transparent,false);
  assert(l.emissiveIntensity<=Math.max(base.emissiveIntensity,.35));
  assert.notEqual(l.color.getHex(),base.color.getHex());
  m.userData.dispose();
 }
 plain.userData.dispose();
});

test('other potions are left alone',()=>{
 const m=make('gain level');
 assert.equal(m.userData.twist,undefined);
 m.userData.dispose();
});
