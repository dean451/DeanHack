import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundModel} from './ground-models.js';

const make=name=>createGroundModel({name,class:9,color:1,appearance:'ZELGO MER'});
const mesh=m=>{let found;m.traverse(o=>{if(o.userData.part==='scroll')found=o;});return found;};
const draws=m=>m.children.filter(o=>o.name!=='magic').length;
const mean=m=>{const c=mesh(m).geometry.attributes.color;let s=0;for(let i=0;i<c.count;i++)s+=c.getX(i)+c.getY(i)+c.getZ(i);return s/(3*c.count);};

test('unknown and plain scrolls keep the plain paper',()=>{
 const m=make('scroll labeled ZELGO MER');
 assert.equal(m.userData.twist,undefined);
 m.userData.dispose();
});

test('fire, genocide and scare monster darken the paper',()=>{
 const plain=make('scroll of blank paper'),base=mean(plain);
 for(const [name,kind] of [['scroll of fire','fire'],['scroll of genocide','genocide'],['2 scrolls of scare monster','scare monster']]){
  const m=make(name);
  assert.equal(m.userData.twist,kind);
  assert(mean(m)<base-.1,kind);
  m.userData.dispose();
 }
 plain.userData.dispose();
});

test('fire and genocide glow dully from within; flood does not',()=>{
 const fire=make('scroll of fire'),flood=make('scroll of flood'),gen=make('scroll of genocide');
 assert(mesh(fire).material.emissive.getHex()>0&&mesh(fire).material.emissiveIntensity>0);
 assert(mesh(gen).material.emissive.getHex()>0&&mesh(gen).material.emissiveIntensity>0);
 assert.equal(mesh(flood).material.emissive.getHex(),0);
 for(const m of [fire,flood,gen])m.userData.dispose();
});

test('the scroll stays one draw',()=>{
 const m=make('scroll of fire');
 assert.equal(draws(m),1);
 m.userData.dispose();
});

test('every twisted scroll type shifts the paper and keeps one draw',()=>{
 const plain=make('scroll of blank paper'),base=mean(plain);
 for(const name of ['create monster','stinking cloud','punishment','amnesia','enchant weapon','enchant armor','remove curse','fire','flood','light','teleportation','destroy armor','taming','charging','identify','earth','confuse monster','magic mapping','gold detection','food detection']){
  const m=make(`scroll of ${name}`);
  assert.equal(m.userData.twist,name);
  assert(Math.abs(mean(m)-base)>.01,name);
  assert.equal(draws(m),1);
  m.userData.dispose();
 }
 plain.userData.dispose();
});
