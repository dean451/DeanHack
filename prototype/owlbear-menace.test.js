import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

function meshes(actor){const out=[];actor.g.traverse(o=>{if(o.isMesh)out.push(o);});return out;}

test('the owlbear glares with burning eyes the plain ape lacks',()=>{
 const owl=createCreature({name:'owlbear',symbol:'Y'.charCodeAt(0),color:3});
 const ape=createCreature({name:'ape',symbol:'Y'.charCodeAt(0),color:3});
 const glow=a=>meshes(a).filter(m=>m.material.emissiveIntensity>2).length;
 assert(glow(owl)>=1);assert.equal(glow(ape),0);
 owl.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(owl.g);
 assert(b.max.y<1.9&&b.min.y>-.01);
});
