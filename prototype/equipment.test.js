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

test('a bullwhip has its own coiled, braided lash, merged to one mesh per material',()=>{
 const whip=createHeldWeapon({name:'bullwhip',class:2});
 assert.deepEqual(whip.children.map(c=>c.userData.part).sort(),['fittings','whip']);
 const iron=whip.children.find(c=>c.userData.part==='fittings');
 assert(iron.material.metalness>=.75,'weapon-magic can sheathe the iron');
 whip.updateMatrixWorld(true);
 for(const mesh of whip.children){const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),'finite vertices');}
 const box=new THREE.Box3().setFromObject(whip);
 // The coils rise above the hand and hang beside it; they sag back (−z), so laid on the floor
 // (x −PI/2, scale .8, y .052 in live.js) they stay above the floor.
 assert(box.max.y>.3&&box.max.y<.5,`top ${box.max.y}`);
 assert(box.max.x>.2&&box.min.x>-.06,`x ${box.min.x}..${box.max.x}`);
 assert(.052+.8*box.min.z>0,`floor clearance ${box.min.z}`);
 assert(box.max.z<.04,`z ${box.max.z}`);
 whip.userData.dispose();
});

test('a boomerang has its own hooked, bone-toothed stick, merged to one mesh per material',()=>{
 const stick=createHeldWeapon({name:'boomerang',class:2});
 assert.deepEqual(stick.children.map(c=>c.userData.part).sort(),['fittings','stick']);
 const iron=stick.children.find(c=>c.userData.part==='fittings');
 assert(iron.material.metalness>=.75,'weapon-magic can sheathe the iron');
 for(const mesh of stick.children){const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),'finite vertices');}
 stick.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(stick);
 // The grip rises from the hand to the elbow and the long arm reaches out along +x; it is
 // flat in z, so laid on the floor (x −PI/2, scale .8, y .052 in live.js) it lies flat.
 assert(box.max.y>.2&&box.max.y<.3,`top ${box.max.y}`);
 assert(box.max.x>.35&&box.max.x<.45&&box.min.x>-.06,`x ${box.min.x}..${box.max.x}`);
 assert(box.max.z<.025&&box.min.z>-.025,`z ${box.min.z}..${box.max.z}`);
 assert(.052+.8*box.min.z>0,'above the floor');
 stick.userData.dispose();
});

test('a dart is its own barbed, fletched dart in two meshes',()=>{
 for(const name of ['dart','12 +0 darts']){
  const dart=createHeldWeapon({name,class:2});
  assert.deepEqual(dart.children.map(c=>c.userData.part).sort(),['head','shaft']);
  const head=dart.children.find(c=>c.userData.part==='head');
  assert(head.material.metalness>=.75,'weapon-magic can sheathe the iron');
  for(const mesh of dart.children){const p=mesh.geometry.attributes.position;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),'finite vertices');}
  dart.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(dart);
  // Point up from the hand, a slim body; laid on the floor (x −PI/2, scale .8, y .052) the
  // flights stay above it.
  assert(box.max.y>.2&&box.max.y<.21&&box.min.y>-.09,`y ${box.min.y}..${box.max.y}`);
  for(const v of [box.min.x,box.max.x,box.min.z,box.max.z])assert(Math.abs(v)<.03,`xz ${v}`);
  assert(.052+.8*box.min.z>0,'above the floor');
  dart.userData.dispose();
 }
});

test('a shuriken is its own six-pointed, raked iron star in one mesh',()=>{
 for(const name of ['shuriken','throwing star']){
  const star=createHeldWeapon({name,class:2});
  assert.deepEqual(star.children.map(c=>c.userData.part),['star']);
  const mesh=star.children[0];
  assert(mesh.material.metalness>=.75,'weapon-magic can sheathe the iron');
  const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),'finite vertices');
  star.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(star);
  // It stands in the xy plane just above the hand and is flat in z, so laid on the floor
  // (x −PI/2, scale .8, y .052 in live.js) it lies flat.
  assert(box.min.y>-.01&&box.max.y<.2,`y ${box.min.y}..${box.max.y}`);
  assert(Math.abs(box.max.x)<.1&&Math.abs(box.min.x)<.1,`x ${box.min.x}..${box.max.x}`);
  assert(box.max.z<.01&&box.min.z>-.01,`z ${box.min.z}..${box.max.z}`);
  assert(.052+.8*box.min.z>0,'above the floor');
  star.userData.dispose();
 }
});

test('an aklys or thonged club is its own spiked club on a thong in two meshes',()=>{
 for(const name of ['aklys','thonged club','a +1 aklys']){
  const club=createHeldWeapon({name,class:2});
  assert.deepEqual(club.children.map(c=>c.userData.part).sort(),['head','shaft']);
  const head=club.children.find(c=>c.userData.part==='head');
  assert(head.material.metalness>=.75,'weapon-magic can sheathe the iron');
  for(const mesh of club.children){const p=mesh.geometry.attributes.position;
   assert.equal(mesh.geometry.attributes.color.count,p.count);
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),'finite vertices');}
  club.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(club);
  // The head up from the hand, the thong hanging below it to one side; laid on the floor
  // (x −PI/2, scale .8, y .052) it rests on its worn-down underside spikes, whose tips sink
  // at most a hair into the floor.
  assert(box.max.y>.44&&box.max.y<.48&&box.min.y>-.3,`y ${box.min.y}..${box.max.y}`);
  assert(box.max.x<.16&&box.min.x>-.12,`x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>-.015,`floor clearance ${box.min.z}`);
  club.userData.dispose();
 }
});

test('arrows and crossbow bolts are their own fletched models in two meshes, a stack a sheaf of three',()=>{
 const cases=[['arrow','arrow',1],['12 +0 arrows','arrow',3],['runed arrow','elven',1],['3 elven arrows','elven',3],['crude arrow','orcish',1],
  ['silver arrow','silver',1],['bamboo arrow','ya',1],['5 ya','ya',3],['crossbow bolt','bolt',1],['20 crossbow bolts','bolt',3]];
 for(const [name,kind,count] of cases){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.arrow,{kind,count},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['head','shaft'],name);
  assert(w.children.find(c=>c.userData.part==='head').material.metalness>=.75,'weapon-magic can sheathe the iron');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),'finite vertices');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w),long=kind==='bolt'?[.19,.23]:[.4,.56];
  assert(box.max.y>long[0]&&box.max.y<long[1]&&box.min.y>-.3,`${name} y ${box.min.y}..${box.max.y}`);
  for(const v of [box.min.x,box.max.x])assert(Math.abs(v)<(count>1?.09:.035),`${name} x ${v}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  w.userData.dispose();
 }
});

test('a worm tooth is a hooked, saw-edged fang and a crysknife the curved blade ground from one, two meshes each',()=>{
 for(const [name,kind] of [['worm tooth','worm tooth'],['+2 worm tooth','worm tooth'],['crysknife','crysknife'],['uncursed +0 crysknife','crysknife']]){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.wormTooth,{kind},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['blade','grip'],name);
  assert(w.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic can sheathe the tooth');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.34&&box.max.y<.46&&box.min.y>-.13,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.max.x>.05&&box.max.x<.14&&box.min.x>-.06,`${name} hooks toward +x: ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  w.userData.dispose();
 }
 // A crysknife is no longer the generic dagger.
 assert.notEqual(createHeldWeapon({name:'crysknife',class:2}).children.length,createHeldWeapon({name:'knife',class:2}).children.length);
});

test('a sling is two braided cords to a cupped pouch holding a flint, two meshes',()=>{
 for(const name of ['sling','+1 sling','uncursed sling']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.sling,{kind:'sling'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['sling','stone'],name);
  assert(w.children.find(c=>c.userData.part==='stone').material.metalness>=.75,'weapon-magic can sheathe the stone');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.4&&box.max.y<.46&&box.min.y>-.11,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.min.x>-.07&&box.max.x<.07,`${name} x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  // The stone sits in the pouch at the top, the hand end at the bottom.
  const stone=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='stone'));
  assert(stone.min.y>.35&&stone.max.y<box.max.y,'stone in the pouch');
  w.userData.dispose();
 }
 // No longer the leather-stick proxy.
 assert.notEqual(createHeldWeapon({name:'sling',class:2}).children.length,createHeldWeapon({name:'plain stick',class:2}).children.length);
});

test('a stiletto is a square-sectioned needle blade over a clawed guard and corded grip, two meshes',()=>{
 for(const name of ['stiletto','+2 stiletto','cursed stiletto']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.stiletto,{kind:'stiletto'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['blade','grip'],name);
  assert(w.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic can sheathe the blade');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.49&&box.max.y<.51&&box.min.y>-.15,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.min.x>-.075&&box.max.x<.075,`${name} x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  // The cord grip sits at the hand, below the guard.
  const grip=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='grip'));
  assert(grip.min.y<-.07&&grip.max.y<.07,'grip at the hand');
  w.userData.dispose();
 }
 // No longer the leather-stick proxy, and not the generic dagger either.
 assert.notEqual(createHeldWeapon({name:'stiletto',class:2}).children.length,createHeldWeapon({name:'plain stick',class:2}).children.length);
 assert.notEqual(createHeldWeapon({name:'stiletto',class:2}).children.length,createHeldWeapon({name:'dagger',class:2}).children.length);
});

test('a katana is a curved, ridged blade over a pierced tsuba and silk-wrapped hilt, two meshes',()=>{
 for(const name of ['katana','+1 katana','samurai sword','blessed rustproof +2 katana']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.katana,{kind:'katana'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['blade','grip'],name);
  assert(w.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic can sheathe the blade');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.85&&box.max.y<.87&&box.min.y>-.2,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.min.x>-.05&&box.max.x<.05,`${name} x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  // The point curves back (sori): the tip sits behind the blade's base.
  const p=w.children.find(c=>c.userData.part==='blade').geometry.attributes.position;let tip=0;
  for(let i=1;i<p.count;i++)if(p.getY(i)>p.getY(tip))tip=i;
  assert(p.getZ(tip)<-.02,`the point curves back, z ${p.getZ(tip)}`);
  // The long two-handed hilt sits at the hand, below the tsuba.
  const grip=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='grip'));
  assert(grip.min.y<-.17&&grip.max.y<.06,'grip at the hand');
  // The blade's flats face outward: on each side of the blade the faces look away from the middle.
  {const q=p,a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3(),nrm=new THREE.Vector3();let out=0,inn=0;
   for(let i=0;i<q.count;i+=3){a.fromBufferAttribute(q,i);b.fromBufferAttribute(q,i+1);d.fromBufferAttribute(q,i+2);
    const cx=(a.x+b.x+d.x)/3,cy=(a.y+b.y+d.y)/3;if(cy<.1||cy>.8||Math.abs(cx)<.0005)continue;
    nrm.subVectors(b,a).cross(d.clone().sub(a)).normalize();if(Math.abs(nrm.x)<.5)continue;
    if(Math.sign(nrm.x)===Math.sign(cx))out++;else inn++;}
   assert(out>500&&inn===0,`${name} flats wound outward: ${out} out, ${inn} in`);}
  w.userData.dispose?.();
 }
 // The tsurugi ("long samurai sword") is not a katana; the generic sword is not either.
 assert.equal(createHeldWeapon({name:'long samurai sword',class:2}).userData.katana,undefined);
 assert.equal(createHeldWeapon({name:'long sword',class:2}).userData.katana,undefined);
});

test('a tsurugi is a long straight double-edged blade over a spurred tsuba, cord grip and ring pommel, two meshes',()=>{
 for(const name of ['tsurugi','+2 tsurugi','long samurai sword','rusty +0 tsurugi']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.tsurugi,{kind:'tsurugi'},name);
  assert.equal(w.userData.katana,undefined,name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['blade','grip'],name);
  assert(w.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic can sheathe the blade');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.99&&box.max.y<1.01&&box.min.y>-.28&&box.min.y<-.25,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.min.x>-.04&&box.max.x<.04,`${name} x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  // Straight and double-edged: the point is on the axis and the blade is as wide each side of it.
  const p=w.children.find(c=>c.userData.part==='blade').geometry.attributes.position;let tip=0,zMin=0,zMax=0;
  for(let i=0;i<p.count;i++){if(p.getY(i)>p.getY(tip))tip=i;if(p.getY(i)>.1&&p.getY(i)<.9){zMin=Math.min(zMin,p.getZ(i));zMax=Math.max(zMax,p.getZ(i));}}
  assert(Math.abs(p.getZ(tip))<1e-6&&Math.abs(p.getX(tip))<1e-6,'the point is on the axis');
  assert(Math.abs(zMax+zMin)<1e-4&&zMax>.015,`two edges ${zMin}..${zMax}`);
  // The cord grip sits at the hand, below the tsuba.
  const grip=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='grip'));
  assert(grip.min.y<-.18&&grip.max.y<.06,'grip at the hand');
  // The blade's flats face outward.
  {const a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3(),nrm=new THREE.Vector3();let out=0,inn=0;
   for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);d.fromBufferAttribute(p,i+2);
    const cx=(a.x+b.x+d.x)/3,cy=(a.y+b.y+d.y)/3;if(cy<.1||cy>.9||Math.abs(cx)<.0005)continue;
    nrm.subVectors(b,a).cross(d.clone().sub(a)).normalize();if(Math.abs(nrm.x)<.5)continue;
    if(Math.sign(nrm.x)===Math.sign(cx))out++;else inn++;}
   assert(out>500&&inn===0,`${name} flats wound outward: ${out} out, ${inn} in`);}
  w.userData.dispose();
 }
 // The artifact takes it through its base; the plain long sword stays the generic blade.
 assert.deepEqual(createHeldWeapon({name:'Tsurugi of Muramasa',class:2,base:'tsurugi'}).userData.tsurugi,{kind:'tsurugi'});
 assert.equal(createHeldWeapon({name:'long sword',class:2}).userData.tsurugi,undefined);
 assert.equal(createHeldWeapon({name:'samurai sword',class:2}).userData.tsurugi,undefined);
});

test('a two-handed sword is a long wavy flamberge over barbed hooks, a wide quillon guard, a long leather grip and a pear pommel, two meshes',()=>{
 for(const name of ['two-handed sword','+3 two-handed sword','rusty +0 two-handed sword']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.twoHandedSword,{kind:'two-handed sword'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['blade','grip'],name);
  assert(w.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic can sheathe the blade');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>1.11&&box.max.y<1.13&&box.min.y>-.4&&box.min.y<-.37,`${name} y ${box.min.y}..${box.max.y}`);
  // The quillons run along the edges (x); the flats face ±z, so it lies flat on the floor.
  assert(box.max.x>.17&&box.max.x<.2&&Math.abs(box.max.x+box.min.x)<1e-6,`${name} x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  // The lower blade snakes side to side; the point is back on the axis.
  const p=w.children.find(c=>c.userData.part==='blade').geometry.attributes.position;let tip=0,left=0,right=0;
  for(let i=0;i<p.count;i++){if(p.getY(i)>p.getY(tip))tip=i;
   if(p.getY(i)>.25&&p.getY(i)<.7&&Math.abs(p.getZ(i))>.003&&Math.abs(p.getX(i))<.012){left=Math.min(left,p.getX(i));right=Math.max(right,p.getX(i));}}
  assert(Math.abs(p.getX(tip))<1e-6&&Math.abs(p.getZ(tip))<1e-6,'the point is on the axis');
  assert(left<-.004&&right>.004,`the ridge waves ${left}..${right}`);
  // The leather grip sits at the hand, under the guard.
  const grip=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='grip'));
  assert(grip.min.y<-.29&&grip.min.y>-.32,'grip at the hand');
  // The blade's flats face outward.
  {const a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3(),nrm=new THREE.Vector3();let out=0,inn=0;
   for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);d.fromBufferAttribute(p,i+2);
    const cz=(a.z+b.z+d.z)/3,cy=(a.y+b.y+d.y)/3,cx=(a.x+b.x+d.x)/3;if(cy<.22||cy>1.05||Math.abs(cx)>.035||Math.abs(cz)<.0005)continue;
    nrm.subVectors(b,a).cross(d.clone().sub(a)).normalize();if(Math.abs(nrm.z)<.5)continue;
    if(Math.sign(nrm.z)===Math.sign(cz))out++;else inn++;}
   assert(out>500&&inn===0,`${name} flats wound outward: ${out} out, ${inn} in`);}
  w.userData.dispose();
 }
 // The other long blades keep their own models.
 assert.equal(createHeldWeapon({name:'long sword',class:2}).userData.twoHandedSword,undefined);
 assert.equal(createHeldWeapon({name:'broadsword',class:2}).userData.twoHandedSword,undefined);
 assert.equal(createHeldWeapon({name:'tsurugi',class:2}).userData.twoHandedSword,undefined);
});

test('a scalpel is a small bellied blade on a cracked bone handle, two meshes',()=>{
 for(const name of ['scalpel','+1 scalpel','rusty scalpel']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.scalpel,{kind:'scalpel'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['blade','grip'],name);
  assert(w.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic can sheathe the blade');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.19&&box.max.y<.21&&box.min.y>-.16,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.min.x>-.02&&box.max.x<.02,`${name} x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  // The bone handle sits at the hand, below the blade.
  const grip=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='grip'));
  assert(grip.min.y<-.14&&grip.max.y<.02,'handle at the hand');
  w.userData.dispose();
 }
 // No longer the leather-stick proxy, and not the generic dagger either.
 assert.notEqual(createHeldWeapon({name:'scalpel',class:2}).children.length,createHeldWeapon({name:'plain stick',class:2}).children.length);
 assert.notEqual(createHeldWeapon({name:'scalpel',class:2}).children.length,createHeldWeapon({name:'dagger',class:2}).children.length);
});

test('a dwarvish mattock is a broad adze and hooked pick on a long iron-shod haft, two meshes',()=>{
 for(const name of ['dwarvish mattock','broad pick','+2 dwarvish mattock','rusty broad pick']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.mattock,{kind:'mattock'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['haft','head'],name);
  assert(w.children.find(c=>c.userData.part==='head').material.metalness>=.75,'weapon-magic can sheathe the iron');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.8&&box.max.y<.9&&box.min.y>-.4&&box.min.y<-.3,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.max.x>.25&&box.min.x<-.25&&box.max.x<.35&&box.min.x>-.35,`${name} x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0&&box.max.z<.065,`${name} flat on the floor, z ${box.min.z}..${box.max.z}`);
  // The adze (+x) and the pick (-x) both droop below the eye.
  const p=w.children.find(c=>c.userData.part==='head').geometry.attributes.position;let ax=0,px=0;
  for(let i=1;i<p.count;i++){if(p.getX(i)>p.getX(ax))ax=i;if(p.getX(i)<p.getX(px))px=i;}
  assert(p.getY(ax)<.66&&p.getY(px)<.62,`blade ends droop, ${p.getY(ax)} ${p.getY(px)}`);
  // The adze edge is broad, the pick point sharp.
  let edge=0,point=0;for(let i=0;i<p.count;i++){if(p.getX(i)>p.getX(ax)-.004)edge=Math.max(edge,Math.abs(p.getZ(i)));if(p.getX(i)<p.getX(px)+.004)point=Math.max(point,Math.abs(p.getZ(i)));}
  assert(edge>.05&&point<.01,`edge ${edge}, point ${point}`);
  // Every part is closed and wound outward, so each mesh encloses a positive volume.
  for(const mesh of w.children){const q=mesh.geometry.attributes.position,a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3();let v=0;
   for(let i=0;i<q.count;i+=3){a.fromBufferAttribute(q,i);b.fromBufferAttribute(q,i+1);d.fromBufferAttribute(q,i+2);v+=a.dot(b.cross(d));}
   assert(v>0,`${mesh.userData.part} winds outward`);}
  // The haft and grip sit at the hand.
  const haft=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='haft'));
  assert(haft.min.y<-.25&&Math.max(-haft.min.x,haft.max.x)<.04,'haft at the hand');
  w.userData.dispose();
 }
 // No longer the leather-stick proxy; the pick-axe is not a mattock.
 assert.notEqual(createHeldWeapon({name:'broad pick',class:2}).children.length,createHeldWeapon({name:'plain stick',class:2}).children.length);
 assert.equal(createHeldWeapon({name:'pick-axe',class:6}).userData.mattock,undefined);
});

test('a pick-axe is a square pick and narrow chisel on a leather-gripped hickory haft, two meshes; a crystal pick adds a glass head',()=>{
 for(const name of ['pick-axe','+1 pick-axe','rusty pick-axe','crystal pick','+2 crystal pick']){
  const crystal=/crystal/.test(name),w=createHeldWeapon({name,class:6});
  assert.deepEqual(w.userData.pickAxe,{kind:crystal?'crystal pick':'pick-axe'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),crystal?['fittings','haft','head']:['haft','head'],name);
  const head=w.children.find(c=>c.userData.part==='head');
  if(crystal)assert(head.material.transparent&&head.material.opacity<1,'glass head');
  else assert(head.material.metalness>=.75,'weapon-magic can sheathe the iron');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.6&&box.max.y<.7&&box.min.y>-.23&&box.min.y<-.18,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.max.x>.24&&box.min.x<-.26&&box.max.x<.3&&box.min.x>-.3,`${name} x ${box.min.x}..${box.max.x}`);
  assert(.052+.8*box.min.z>0&&box.max.z<.05,`${name} flat on the floor, z ${box.min.z}..${box.max.z}`);
  // Both ends curve down below the eye; the pick ends in a point, the chisel in a narrow edge.
  const p=head.geometry.attributes.position;let ax=0,px=0;
  for(let i=1;i<p.count;i++){if(p.getX(i)>p.getX(ax))ax=i;if(p.getX(i)<p.getX(px))px=i;}
  assert(p.getY(ax)<.56&&p.getY(px)<.54,`ends curve down, ${p.getY(ax)} ${p.getY(px)}`);
  let edge=0,point=0;for(let i=0;i<p.count;i++){if(p.getX(i)>p.getX(ax)-.004)edge=Math.max(edge,Math.abs(p.getZ(i)));if(p.getX(i)<p.getX(px)+.004)point=Math.max(point,Math.abs(p.getZ(i)));}
  assert(edge>.015&&point<.006,`edge ${edge}, point ${point}`);
  // Every part is closed and wound outward, so each mesh encloses a positive volume.
  for(const mesh of w.children){const q=mesh.geometry.attributes.position,a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3();let v=0;
   for(let i=0;i<q.count;i+=3){a.fromBufferAttribute(q,i);b.fromBufferAttribute(q,i+1);d.fromBufferAttribute(q,i+2);v+=a.dot(b.cross(d));}
   assert(v>0,`${mesh.userData.part} winds outward`);}
  const haft=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='haft'));
  assert(haft.min.y<-.18&&Math.max(-haft.min.x,haft.max.x)<.04,'haft at the hand');
  w.userData.dispose();
 }
 // No longer the hand axe; the mattock and the plain axe keep their own models.
 assert.equal(createHeldWeapon({name:'dwarvish mattock',class:2}).userData.pickAxe,undefined);
 assert.equal(createHeldWeapon({name:'axe',class:2}).userData.pickAxe,undefined);
 assert.equal(createHeldWeapon({name:'lock pick',class:6}).userData.pickAxe,undefined);
});

test('a rubber hose is a perished black hose over a taped grip with a brass coupling and barbed wire, two meshes',()=>{
 for(const name of ['rubber hose','+1 rubber hose','cursed rubber hose']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.rubberHose,{kind:'rubber hose'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['fittings','hose'],name);
  assert(w.children.find(c=>c.userData.part==='fittings').material.metalness>=.75,'weapon-magic can sheathe the fittings');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.45&&box.max.y<.52&&box.min.y>-.16,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.min.x>-.03&&box.max.x<.26,`${name} x ${box.min.x}..${box.max.x}`);
  assert(box.max.z-box.min.z<.06,`${name} lies flat: z ${box.min.z}..${box.max.z}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor`);
  // The coupling hangs at the far end, out past the bend, below the top of the curve.
  const fit=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='fittings'));
  assert(fit.max.x>.2&&fit.min.y>.2,'coupling and wire at the striking end');
  w.userData.dispose();
 }
 // No longer the leather-stick proxy, and not the bullwhip either.
 assert.notEqual(createHeldWeapon({name:'rubber hose',class:2}).children.length,createHeldWeapon({name:'plain stick',class:2}).children.length);
 assert.equal(createHeldWeapon({name:'bullwhip',class:2}).userData.rubberHose,undefined);
});

test('a scimitar is a curved, yelman-tipped blade over a clawed guard and wire-bound horn grip, two meshes',()=>{
 for(const name of ['scimitar','+1 scimitar','curved sword','rusty +0 scimitar']){
  const w=createHeldWeapon({name,class:2});
  assert.deepEqual(w.userData.scimitar,{kind:'scimitar'},name);
  assert.deepEqual(w.children.map(c=>c.userData.part).sort(),['blade','grip'],name);
  assert(w.children.find(c=>c.userData.part==='blade').material.metalness>=.75,'weapon-magic can sheathe the blade');
  for(const mesh of w.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)),'finite vertices and normals');}
  w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w);
  assert(box.max.y>.83&&box.max.y<.85&&box.min.y>-.2,`${name} y ${box.min.y}..${box.max.y}`);
  assert(box.min.x>-.03&&box.max.x<.03,`${name} x ${box.min.x}..${box.max.x}`);
  assert(box.max.z<.09,`${name} z ${box.max.z}`);
  assert(.052+.8*box.min.z>0,`${name} above the floor, z ${box.min.z}`);
  // The blade bellies forward toward the edge, then the point hooks back behind the grip.
  const p=w.children.find(c=>c.userData.part==='blade').geometry.attributes.position;let tip=0,belly=-1;
  for(let i=1;i<p.count;i++){if(p.getY(i)>p.getY(tip))tip=i;if(p.getY(i)>.3&&p.getY(i)<.5)belly=Math.max(belly,p.getZ(i));}
  assert(p.getZ(tip)<-.02,`the point hooks back, z ${p.getZ(tip)}`);
  assert(belly>.04,`the belly sweeps forward, z ${belly}`);
  const grip=new THREE.Box3().setFromObject(w.children.find(c=>c.userData.part==='grip'));
  assert(grip.min.y<-.1&&grip.max.y<.05,'grip at the hand');
  w.userData.dispose?.();
 }
 // Other swords keep their own models.
 assert.equal(createHeldWeapon({name:'long sword',class:2}).userData.scimitar,undefined);
 assert.equal(createHeldWeapon({name:'silver saber',class:2}).userData.scimitar,undefined);
});

test('the generic long blade carries a fuller on each flat; a dagger does not',()=>{
 const count=name=>createHeldWeapon({name,class:2}).children.length;
 assert.equal(count('long sword'),count('dagger')+1);
});
