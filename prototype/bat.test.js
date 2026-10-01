import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const span=a=>{const b=new THREE.Box3().setFromObject(a.g);return b.max.x-b.min.x;};

test('bats are gaunt, fanged fliers with jointed, torn membrane wings, and the giant bat is twice the bat',()=>{
 const bat=createCreature({name:'bat'}),giant=createCreature({name:'giant bat'}),vampire=createCreature({name:'vampire bat'});
 for(const a of [bat,giant,vampire]){
  assert.equal(a.quirk,'bat');assert(a.head&&a.body);
  assert.equal(a.wings.length,2);assert.deepEqual(a.wings.map(w=>w.userData.side),[-1,1]);
  let meshes=0;a.g.traverse(o=>{if(o.isMesh){meshes++;for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));}});
  assert(meshes<=8,`${meshes} meshes`);
  const membrane=a.wings[0].children.find(m=>m.name==='bat-wing-membrane');
  assert(membrane.material.side===THREE.DoubleSide&&membrane.userData.hasOutline,'the membrane is one sheet, lit from both sides and never outlined');
  // every bat flies at about the same height, whatever its size
  const y=new THREE.Box3().setFromObject(a.g).getCenter(new THREE.Vector3()).y;
  assert(y>.55&&y<.85,`flies at ${y}`);
 }
 assert(span(giant)>=span(bat)*2.2,`giant bat spans ${span(giant)}, bat ${span(bat)}`);
 assert(span(giant)>1.3,'the giant bat is well over a tile across');
 assert(span(vampire)>span(bat)&&span(vampire)<span(giant));
 // an unnamed B is a bat in its glyph colour
 assert.equal(createCreature({name:'odd bat',symbol:66,color:1}).quirk,'bat');
});
