import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const D=68;
function glowOf(actor){return '#'+actor.core.material.emissive.getHexString();}

test('each shuffled dragon name gets its own grounded, finite body plan',()=>{
 const plans={draken:[4,2],wyvern:[2,2],sarkany:[4,2],amphitere:[0,2],lindworm:[2,0],tatzelworm:[2,0],guivre:[0,0],leviathan:[0,0],sirrush:[4,0],tiamat:[4,2]};
 for(const [name,[legs,wings]] of Object.entries(plans))for(const baby of [false,true]){
  const actor=createCreature({name:(baby?'baby ':'')+name,symbol:D,color:3});
  assert.equal(actor.quirk,'dragon');assert.equal(actor.legs.length,legs,name);assert.equal(actor.wings.length,wings,name);
  assert(actor.core&&actor.tail,name);
  actor.g.updateMatrixWorld(true);
  actor.g.traverse(part=>{if(part.geometry)for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  const bounds=new THREE.Box3().setFromObject(actor.g);
  assert(bounds.min.y>-.005,name);assert(bounds.max.y<1.35,name);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<1.05,name);
 }
});

test('the dragon breath glow follows the glyph colour, and an unidentified brown dragon shows only an ember',()=>{
 const unknown=createCreature({name:'wyvern',symbol:D,color:3});
 const fire=createCreature({name:'wyvern',symbol:D,color:1});
 const frost=createCreature({name:'wyvern',symbol:D,color:15});
 assert.equal(glowOf(unknown),'#ff8a3a');
 assert.notEqual(glowOf(fire),glowOf(unknown));assert.notEqual(glowOf(frost),glowOf(fire));
 // named test dragons with no colour fall back on the colour word in the name
 assert.equal(glowOf(createCreature({name:'red dragon'})),glowOf(fire));
 const babies=new THREE.Box3().setFromObject(createCreature({name:'baby draken',symbol:D,color:3}).g),adults=new THREE.Box3().setFromObject(createCreature({name:'draken',symbol:D,color:3}).g);
 assert(babies.max.y<adults.max.y*.75);
});
