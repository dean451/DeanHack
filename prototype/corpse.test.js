import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createCorpse,corpseLie} from './corpse.js';

const factory={creatureFactory:createCreature};
const lieOf=name=>createCorpse(name,2,0,factory).userData.lie;

test('corpses lie the way their bodies fall',()=>{
 assert.equal(corpseLie('humanoid',1,.4),'front');
 assert.equal(corpseLie('beast',.2,.8),'back');
 assert.equal(corpseLie('beast',.7,.8),'side');
 assert.equal(corpseLie('bug',.3,.6),'back');
 assert.equal(corpseLie('blob',.3,.6),'splat');
 assert.equal(lieOf('lizard'),'back');
 assert.equal(lieOf('jackal'),'side');
 assert.equal(lieOf('dwarf'),'front');
 assert.equal(lieOf('giant ant'),'back');
 assert.equal(lieOf('acid blob'),'splat');
});

test('a corpse is the creature\'s own model, flat on the floor and inside its tile',()=>{
 for(const name of ['lizard','newt','jackal','human','giant ant','raven','acid blob','red dragon','horse','garter snake','dwarf','lichen']){
  const corpse=createCorpse(name,2,0,factory),body=corpse.children.find(o=>o.userData.part==='corpse');
  assert(corpse.userData.lie,`${name} fell back to a generic body`);
  const pos=body.geometry.attributes.position,col=body.geometry.attributes.color;
  for(const v of pos.array)assert(Number.isFinite(v),`${name} has a bad vertex`);
  for(const v of col.array)assert(v>=0&&v<=1,`${name} has a bad colour`);
  const b=new THREE.Box3().setFromObject(corpse),size=b.getSize(new THREE.Vector3());
  assert(b.min.y>-.01&&b.min.y<.01,`${name} floats or sinks (${b.min.y})`);
  assert(Math.max(size.x,size.z)<=1.01,`${name} spills out of its tile`);
  assert(size.y<.9,`${name} still stands ${size.y} tall`);
  corpse.userData.dispose();
 }
 // The lizard is long and low: it lies on its back, not as a furry quadruped.
 const lizard=new THREE.Box3().setFromObject(createCorpse('lizard',2,0,factory)).getSize(new THREE.Vector3());
 assert(lizard.y<.25&&Math.max(lizard.x,lizard.z)>.8);
});

test('without a creature model the corpse falls back to the generic body plan',()=>{
 const plain=createCorpse('lizard',2,0);
 assert.equal(plain.userData.lie,null);
 assert.equal(plain.userData.plan,'beast');
 const broken=createCorpse('iguana',2,0,{creatureFactory:()=>{throw new Error('no');}});
 assert.equal(broken.userData.lie,null);
});

test('a corpse takes the class letter, guesses it for dragons and people, and never stands tall',()=>{
 const verts=c=>c.children.find(x=>x.userData.part==='corpse').geometry.attributes.position.count;
 const sent=createCorpse('leviathan',4,0,{creatureFactory:createCreature,symbol:'D'.charCodeAt(0)});
 const guessed=createCorpse('leviathan',4,0,{creatureFactory:createCreature});
 assert.equal(verts(guessed),verts(sent),'UnNetHack dragons are guessed as D');
 assert.notEqual(verts(sent),verts(createCorpse('leviathan',5,0,{creatureFactory:n=>createCreature({...n,symbol:undefined})})),'the letter changes the model');
 for(const name of ['disintegrator','ki-rin','jabberwock','leviathan','minotaur']){
  const c=createCorpse(name,undefined,0,{creatureFactory:createCreature});c.updateMatrixWorld(true);
  const s=new THREE.Box3().setFromObject(c).getSize(new THREE.Vector3());
  assert(s.y<=.63,`${name} lies low (${s.y})`);
 }
});
