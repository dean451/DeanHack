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
