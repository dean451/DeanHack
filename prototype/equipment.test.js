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
