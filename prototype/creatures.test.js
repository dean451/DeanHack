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

test('little dog, dog and large dog are grounded canines that grow with the breed',()=>{
 let last=0;
 for(const name of ['little dog','dog','large dog']){
  const actor=createCreature({name,symbol:100,color:15});
  assert.equal(actor.quirk,'dog',name);assert.equal(actor.legs.length,4,name);assert(actor.tail,name);
  actor.g.updateMatrixWorld(true);
  actor.g.traverse(part=>{if(part.geometry)for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  const bounds=new THREE.Box3().setFromObject(actor.g),size=bounds.getSize(new THREE.Vector3());
  assert(Math.abs(bounds.min.y)<.01,name);assert(bounds.max.y<1.2,name);
  // longer than wide, and longer than a cat of the same size
  assert(size.z>size.x*1.5,name);assert(size.y>last,name);last=size.y;
 }
});

test('pony, horse and warhorse are grounded, hornless horses that grow with the breed and take the glyph colour',()=>{
 let last=0;
 for(const name of ['pony','horse','warhorse']){
  const actor=createCreature({name,symbol:117,color:3});
  assert.equal(actor.g.name,'horse',name);assert.equal(actor.legs.length,4,name);assert(actor.tail,name);
  actor.g.updateMatrixWorld(true);
  actor.g.traverse(part=>{if(part.geometry)for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  const bounds=new THREE.Box3().setFromObject(actor.g),size=bounds.getSize(new THREE.Vector3());
  assert(Math.abs(bounds.min.y)<.01,name);assert(bounds.max.y<1.4,name);
  assert(size.z>size.x*1.8,name);assert(Math.max(-bounds.min.z,bounds.max.z,-bounds.min.x,bounds.max.x)<.85,name);
  assert(size.y>last,name);last=size.y;
 }
 // an unnamed u is a horse too, not a unicorn
 assert.equal(createCreature({symbol:117,color:3}).g.name,'horse');
 assert.notEqual(createCreature({name:'white unicorn',symbol:117,color:15}).g.name,'horse');
});

test('plain dwarves carry a finite forged pick-axe in hand; lords keep it and kings carry a sceptre instead',()=>{
 for(const [name,hasPick] of [['dwarf',true],['dwarf lord',true],['dwarf king',false]]){
  const actor=createCreature({name,symbol:104,color:1});
  const pick=actor.g.getObjectByName('dwarf-pick');
  assert.equal(Boolean(pick),hasPick,name);
  actor.g.updateMatrixWorld(true);
  actor.g.traverse(part=>{if(part.geometry)for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  const bounds=new THREE.Box3().setFromObject(actor.g);
  assert(bounds.min.y>-.05,name);assert(bounds.max.y<1.4,name);
  if(!pick)continue;
  const box=new THREE.Box3().setFromObject(pick);
  // held at the dwarf's left side: the butt clears the floor and the head stays near head height
  assert(box.min.y>0&&box.max.y<1.15&&box.min.x>-.85&&box.max.x<0,name);
  // the head's end caps face outward along the head, so neither end is hollow
  const head=pick.children.find(child=>child.geometry?.attributes.color);
  const positions=head.geometry.attributes.position,index=head.geometry.index.array,ends=[0,0];
  for(let i=index.length-20*3;i<index.length;i+=3){
   const [a,b,c]=[index[i],index[i+1],index[i+2]].map(n=>new THREE.Vector3().fromBufferAttribute(positions,n));
   const normal=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a));
   const centroid=a.clone().add(b).add(c).divideScalar(3);
   if(normal.lengthSq()>0)ends[centroid.x<0?0:1]+=Math.sign(normal.x*centroid.x);
  }
  assert(ends[0]>0&&ends[1]>0,name);
 }
});
