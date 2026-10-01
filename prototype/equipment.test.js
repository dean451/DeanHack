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

test('a partisan has its own winged leaf blade, merged to one mesh per material',()=>{
 for(const name of ['partisan','vulgar polearm']){
  const partisan=createHeldWeapon({name,class:2});
  assert.deepEqual(partisan.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(partisan);
  assert(s.y>1.85&&s.y<2,`length ${s.y}`);
  const b=new THREE.Box3().setFromObject(partisan);
  assert(b.max.x>.13&&b.min.x<-.13,'the wings flare out both sides');
  for(const m of partisan.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));}
  assert(partisan.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic sheathes the blade');
  partisan.userData.dispose();
 }
 assert.deepEqual(createHeldWeapon({name:'angled poleaxe',class:2}).children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
});

test('a bardiche has its own crescent cleaver blade, merged to one mesh per material',()=>{
 for(const name of ['bardiche','long poleaxe']){
  const bardiche=createHeldWeapon({name,class:2});
  assert.deepEqual(bardiche.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(bardiche);
  assert(s.y>1.5&&s.y<1.6,`length ${s.y}`);
  for(const m of bardiche.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));}
  const blade=bardiche.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the blade');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.max.x>.2&&bb.max.y-bb.min.y>.55,'a long crescent swelling out to one side');
  assert(bb.min.x<-.02,'the beak hooks back over the haft');
  bardiche.userData.dispose();
 }
});

test('a voulge has its own tall cleaver blade with a raised point, merged to one mesh per material',()=>{
 for(const name of ['voulge','pole cleaver']){
  const voulge=createHeldWeapon({name,class:2});
  assert.deepEqual(voulge.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(voulge);
  assert(s.y>1.6&&s.y<1.75,`length ${s.y}`);
  for(const m of voulge.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));}
  const blade=voulge.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the blade');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.max.x>.14&&bb.max.x<.18,'narrower than the bardiche');
  assert(bb.max.y>1.15,'the point rises above the haft');
  voulge.userData.dispose();
 }
});

test('a ranseur has its own spike and barbed side prongs, merged to one mesh per material',()=>{
 for(const name of ['ranseur','hilted polearm']){
  const ranseur=createHeldWeapon({name,class:2});
  assert.deepEqual(ranseur.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(ranseur);
  assert(s.y>1.85&&s.y<2,`length ${s.y}`);
  for(const m of ranseur.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));
   const n=m.geometry.attributes.normal.array;assert(n.every(Number.isFinite));}
  const blade=ranseur.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the blade');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.max.x>.19&&bb.min.x<-.19,'prongs flare out both sides');
  assert(bb.max.y>1.4,'the spike rises well above the prongs');
  ranseur.userData.dispose();
 }
});

test('a spetum has its own central blade and forked side blades, merged to one mesh per material',()=>{
 for(const name of ['spetum','forked polearm']){
  const spetum=createHeldWeapon({name,class:2});
  assert.deepEqual(spetum.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(spetum);
  assert(s.y>1.9&&s.y<2.05,`length ${s.y}`);
  for(const m of spetum.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));
   const n=m.geometry.attributes.normal.array;assert(n.every(Number.isFinite));}
  const blade=spetum.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the blade');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.max.x>.2&&bb.min.x<-.2,'side blades fork out both sides');
  assert(bb.max.y>1.45,'the central blade rises above the fork');
  spetum.userData.dispose();
 }
});

test('a lucern hammer has its own pronged hammer, hooked beak and top spike, merged to one mesh per material',()=>{
 for(const name of ['lucern hammer','pronged polearm']){
  const hammer=createHeldWeapon({name,class:2});
  assert.deepEqual(hammer.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(hammer);
  assert(s.y>1.8&&s.y<2.05,`length ${s.y}`);
  for(const m of hammer.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));
   const n=m.geometry.attributes.normal.array;assert(n.every(Number.isFinite));}
  const blade=hammer.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the head');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.min.x<-.25,'the beak reaches back');
  assert(bb.max.x>.15,'the prongs stand out from the face');
  assert(bb.max.y>1.35,'the spike rises above the block');
  hammer.userData.dispose();
 }
});

test('a fauchard has its own hooked sickle blade and back thorn, merged to one mesh per material',()=>{
 for(const name of ['fauchard','pole sickle']){
  const pole=createHeldWeapon({name,class:2});
  assert.deepEqual(pole.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(pole);
  assert(s.y>1.8&&s.y<2.05,`length ${s.y}`);
  for(const m of pole.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));
   const n=m.geometry.attributes.normal.array;assert(n.every(Number.isFinite));}
  const blade=pole.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the blade');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.max.x>.25,'the point hooks out over the haft');
  assert(bb.max.y>1.35&&bb.max.y<1.45,`the crown ${bb.max.y}`);
  const head=pole.children.find(c=>c.userData.part==='head');
  head.geometry.computeBoundingBox();
  assert(head.geometry.boundingBox.min.x<-.1,'the thorn juts back');
  pole.userData.dispose();
 }
});

test('a guisarme has its own pruning-hook blade and back spur, merged to one mesh per material',()=>{
 for(const name of ['guisarme','pruning hook']){
  const pole=createHeldWeapon({name,class:2});
  assert.deepEqual(pole.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(pole);
  assert(s.y>1.8&&s.y<2.05,`length ${s.y}`);
  for(const m of pole.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));
   const n=m.geometry.attributes.normal.array;assert(n.every(Number.isFinite));}
  const blade=pole.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the blade');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.max.x>.18,'the beak hooks out over the haft');
  assert(bb.min.x<-.15,'the spur juts back');
  assert(bb.max.y>1.35&&bb.max.y<1.45,`the crown ${bb.max.y}`);
  pole.userData.dispose();
 }
 // The bill-guisarme is a different weapon and doesn't take the guisarme's blade.
 const bill=createHeldWeapon({name:'bill-guisarme',class:2});
 const bb=new THREE.Box3().setFromObject(bill);
 assert(bb.min.x>-.15,'no back spur on the bill-guisarme');
 bill.userData.dispose();
});

test('a bill-guisarme has its own billhook blade, top spike and back spike, merged to one mesh per material',()=>{
 for(const name of ['bill-guisarme','hooked polearm']){
  const pole=createHeldWeapon({name,class:2});
  assert.deepEqual(pole.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(pole);
  assert(s.y>1.8&&s.y<2.05,`length ${s.y}`);
  for(const m of pole.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));
   const n=m.geometry.attributes.normal.array;assert(n.every(Number.isFinite));}
  const blade=pole.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the blade');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.max.x>.18,'the beak hooks out over the haft');
  assert(bb.min.x<-.11&&bb.min.x>-.15,`the short back spike ${bb.min.x}`);
  assert(bb.max.y>1.45,`the top spike ${bb.max.y}`);
  pole.userData.dispose();
 }
});

test('a bec de corbin has its own crow beak, toothed hammer, top spike and rondel, merged to one mesh per material',()=>{
 for(const name of ['bec de corbin','beaked polearm']){
  const pole=createHeldWeapon({name,class:2});
  assert.deepEqual(pole.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
  const s=size(pole);
  assert(s.y>1.75&&s.y<1.95,`length ${s.y}`);
  for(const m of pole.children){const p=m.geometry.attributes.position.array;assert(p.every(Number.isFinite));
   const n=m.geometry.attributes.normal.array;assert(n.every(Number.isFinite));}
  const blade=pole.children.find(c=>c.userData.part==='blade');
  assert(blade.material.metalness>=.75,'weapon-magic sheathes the beak');
  blade.geometry.computeBoundingBox();
  const bb=blade.geometry.boundingBox;
  assert(bb.max.x>.3,`the long beak ${bb.max.x}`);
  assert(bb.min.x<-.14&&bb.min.x>-.17,`the hammer teeth ${bb.min.x}`);
  assert(bb.max.y>1.33,`the top spike ${bb.max.y}`);
  const head=pole.children.find(c=>c.userData.part==='head');
  head.geometry.computeBoundingBox();
  assert(head.geometry.boundingBox.max.z>.06,'the rondel');
  pole.userData.dispose();
 }
});

test('a lance has its own fluted, toothed vamplate, spiral bands and barbed point, merged to one mesh per material',()=>{
 const lance=createHeldWeapon({name:'lance',class:2});
 assert.deepEqual(lance.children.map(c=>c.userData.part).sort(),['blade','grip','haft','head']);
 const s=size(lance);
 assert(s.y>1.95&&s.y<2.15,`length ${s.y}`);
 for(const m of lance.children){assert(m.geometry.attributes.position.array.every(Number.isFinite));assert(m.geometry.attributes.normal.array.every(Number.isFinite));}
 const blade=lance.children.find(c=>c.userData.part==='blade');
 assert(blade.material.metalness>=.75,'weapon-magic sheathes the point');
 blade.geometry.computeBoundingBox();assert(blade.geometry.boundingBox.max.y>1.65,'the point');
 const head=lance.children.find(c=>c.userData.part==='head');
 head.geometry.computeBoundingBox();assert(head.geometry.boundingBox.max.x>.12&&head.geometry.boundingBox.max.x<.16,`the vamplate ${head.geometry.boundingBox.max.x}`);
 lance.userData.dispose();
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
