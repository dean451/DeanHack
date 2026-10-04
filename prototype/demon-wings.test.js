import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('winged demons carry large wings with holes torn in the membrane',()=>{
 const c=createCreature({name:'balrog',symbol:38,color:1});
 assert.equal(c.wings.length,2);
 for(const w of c.wings){
  const mesh=w.children.find(m=>m.geometry&&m.geometry.type==='ShapeGeometry');
  const box=new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
  assert(box.max.x-box.min.x>.6,'wide, not stubby');
  const pos=mesh.geometry.attributes.position;
  // a plain wing outline needs far fewer vertices than one with three holes cut in it
  assert(pos.count>24,'holes add vertices (21 without them)');
  for(let i=0;i<pos.count;i++)assert(Number.isFinite(pos.getX(i))&&Number.isFinite(pos.getY(i)));
 }
});
