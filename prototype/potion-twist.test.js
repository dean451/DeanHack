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

test('acid burns green inside the glass',()=>{
 const plain=make('healing'),acid=make('potion of acid');
 assert.equal(acid.userData.twist,'acid');
 assert(part(acid,'liquid').material.emissiveIntensity>part(plain,'liquid').material.emissiveIntensity);
 plain.userData.dispose();acid.userData.dispose();
});

test('sickness turns the liquid to a murky, opaque sludge',()=>{
 const plain=make('healing'),sick=make('potion of sickness');
 const l=part(sick,'liquid').material;
 assert.equal(sick.userData.twist,'sickness');
 assert.equal(l.transparent,false);
 assert(l.roughness>part(plain,'liquid').material.roughness);
 plain.userData.dispose();sick.userData.dispose();
});

test('full healing glows pale gold',()=>{
 const plain=make('healing'),full=make('potion of full healing');
 assert.equal(full.userData.twist,'full healing');
 assert(part(full,'liquid').material.emissiveIntensity>part(plain,'liquid').material.emissiveIntensity);
 plain.userData.dispose();full.userData.dispose();
});

test('sleeping goes dim and heavy',()=>{
 const plain=make('healing'),sleepy=make('potion of sleeping');
 assert.equal(sleepy.userData.twist,'sleeping');
 const l=part(sleepy,'liquid').material;
 assert(l.emissiveIntensity<=part(plain,'liquid').material.emissiveIntensity);
 assert(l.roughness>part(plain,'liquid').material.roughness);
 plain.userData.dispose();sleepy.userData.dispose();
});

test('confusion muddies the liquid violet-grey',()=>{
 const plain=make('healing'),mud=make('potion of confusion');
 assert.equal(mud.userData.twist,'confusion');
 const l=part(mud,'liquid').material;
 assert.notEqual(l.color.getHex(),part(plain,'liquid').material.color.getHex());
 assert(l.roughness>part(plain,'liquid').material.roughness);
 plain.userData.dispose();mud.userData.dispose();
});

test('levitation turns the liquid pale and glowing',()=>{
 const plain=make('healing'),light=make('potion of levitation');
 assert.equal(light.userData.twist,'levitation');
 assert(part(light,'liquid').material.emissiveIntensity>part(plain,'liquid').material.emissiveIntensity);
 plain.userData.dispose();light.userData.dispose();
});

test('holy water glows gold and unholy water goes black and dead',()=>{
 const plain=make('healing'),holy=make('potion of holy water'),foul=make('potion of unholy water');
 assert.equal(holy.userData.twist,'holy water');
 assert.equal(foul.userData.twist,'unholy water');
 assert(part(holy,'liquid').material.emissiveIntensity>part(plain,'liquid').material.emissiveIntensity);
 const f=part(foul,'liquid').material;
 assert.equal(f.emissiveIntensity,0);
 assert.equal(f.transparent,false);
 assert(f.color.r<.1&&f.color.g<.1);
 for(const m of [plain,holy,foul])m.userData.dispose();
});

test('monster detection, polymorph and hallucination tint and light the liquid',()=>{
 const plain=make('healing');
 const base=part(plain,'liquid').material;
 for(const [name,kind] of [['potion of monster detection','monster detection'],['potion of polymorph','polymorph'],['2 potions of hallucination','hallucination']]){
  const m=make(name);
  assert.equal(m.userData.twist,kind);
  const l=part(m,'liquid').material;
  assert.notEqual(l.color.getHex(),base.color.getHex());
  assert(l.emissiveIntensity>=.3);
  m.userData.dispose();
 }
 plain.userData.dispose();
});
