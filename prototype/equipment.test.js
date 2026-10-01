import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeldWeapon} from './equipment.js';

const size=g=>{g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());};

test('a wielded artifact takes the model of its base type',()=>{
 const sword=createHeldWeapon({name:'long sword',class:2});
 const excalibur=createHeldWeapon({name:'Excalibur',class:2,base:'long sword'});
 assert.equal(excalibur.name,'Excalibur');
 assert.equal(excalibur.children.length,sword.children.length);
 assert(Math.abs(size(excalibur).y-size(sword).y)<1e-9,'same blade length');
 // without a base (an older bridge) it keeps the fallback
 assert.notEqual(createHeldWeapon({name:'Excalibur',class:2}).children.length,sword.children.length);
});

test('a morning star has its own spiked head, merged to one mesh per material',()=>{
 const star=createHeldWeapon({name:'morning star',class:2});
 const parts=star.children.map(c=>c.userData.part).sort();
 assert.deepEqual(parts,['grip','haft','head','spikes']);
 const s=size(star);
 assert(s.y>.85&&s.y<1.05,`length ${s.y}`);
 assert(s.x>.2&&s.x<.36,'the spiked ball is wider than the haft');
 for(const m of star.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));}
 assert(star.children.find(c=>c.userData.part==='spikes').material.metalness>=.75,'weapon-magic sheathes the spikes');
 star.userData.dispose();
});

test('a halberd has its own forged head, merged to one mesh per material',()=>{
 const halberd=createHeldWeapon({name:'halberd',class:2});
 assert.deepEqual(halberd.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
 const s=size(halberd);
 assert(s.y>1.5&&s.y<1.8,`length ${s.y}`);
 const b=new THREE.Box3().setFromObject(halberd);
 assert(b.max.x>.2&&b.min.x<-.12,'the axe blade and the back fluke stand out from the haft');
 for(const m of halberd.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));}
 assert(halberd.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic sheathes the blade');
 halberd.userData.dispose();
});

test('a trident has three barbed tines, merged to one mesh per material',()=>{
 const trident=createHeldWeapon({name:'trident',class:2});
 assert.deepEqual(trident.children.map(c=>c.userData.part).sort(),['grip','haft','head','tines']);
 const s=size(trident);
 assert(s.y>1.6&&s.y<1.85,`length ${s.y}`);
 const b=new THREE.Box3().setFromObject(trident);
 assert(b.max.x>.17&&b.min.x<-.17,'the outer tines splay out past the haft');
 for(const m of trident.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));}
 assert(trident.children.find(c=>c.userData.part==='tines').material.metalness>=.75,'weapon-magic sheathes the tines');
 trident.userData.dispose();
});

test('a glaive has its own single-edged blade, merged to one mesh per material',()=>{
 for(const name of ['glaive','single-edged polearm']){
  const glaive=createHeldWeapon({name,class:2});
  assert.deepEqual(glaive.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(glaive);
  assert(s.y>1.75&&s.y<1.95,`length ${s.y}`);
  const b=new THREE.Box3().setFromObject(glaive);
  assert(b.max.x>.09&&b.min.x<-.11,'the edge swells out and the fang juts back');
  for(const m of glaive.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));}
  assert(glaive.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic sheathes the blade');
  glaive.userData.dispose();
 }
});

test('a silver saber has its own curved silver blade and knuckle-bow, not the long sword',()=>{
 const saber=createHeldWeapon({name:'silver saber',class:2});
 const grayswandir=createHeldWeapon({name:'Grayswandir',class:2,base:'silver saber'});
 for(const g of [saber,grayswandir]){
  assert.deepEqual(g.children.map(c=>c.userData.part).sort(),['blade','grip','hilt']);
  const s=size(g);
  assert(s.y>.95&&s.y<1.1,`length ${s.y}`);
  for(const m of g.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));}
  const blade=g.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the blade');
  const hex=blade.material.color.getHex();
  assert((hex>>16)>0xe0&&(hex&0xff)>0xe0,'bright silver, not steel');
  blade.geometry.computeBoundingBox();
  assert(blade.geometry.boundingBox.min.x<-.08,'the blade curves back');
 }
 assert.notEqual(saber.children.length,createHeldWeapon({name:'long sword',class:2}).children.length);
 saber.userData.dispose();grayswandir.userData.dispose();
});
