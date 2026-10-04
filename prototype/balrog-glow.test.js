import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

function glows(name){
 const c=createCreature({name,symbol:38,color:1}),out=[];
 c.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.name==='evil-glow')out.push(o);});
 return out;
}

test('the balrog and Durin\'s Bane glow with evil: cracks in the hide and a hellglow pool underfoot',()=>{
 for(const name of ['balrog',"durin's bane"]){
  const parts=glows(name);
  assert(parts.length>=2,name+' has evil-glow parts');
  assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5),name+' has a pool of light on the floor');
  assert(parts.some(m=>!m.material.transparent&&m.material.emissiveIntensity>=2),name+' has bright molten cracks');
 }
});

test('lesser demons carry no evil glow',()=>{
 assert.equal(glows('horned devil').length,0);
 assert.equal(glows('vrock').length,0);
});
