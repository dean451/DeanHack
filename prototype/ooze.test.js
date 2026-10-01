import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {OOZES} from './ooze.js';

test('blobs, jellies, puddings, oozes and slimes are lumpy translucent masses with what they ate inside',()=>{
 const heights={};
 for(const name of Object.keys(OOZES)){
  const a=createCreature({name});
  assert.equal(a.quirk,'blob');assert(a.body);
  const meshes=[];a.g.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert(meshes.length>=1&&meshes.length<=2,`${name}: ${meshes.length} meshes`);
  const slime=meshes.find(m=>m.name==='ooze-slime');
  assert(slime.material.transparent&&!slime.material.depthWrite);
  for(const m of meshes){for(const v of m.geometry.attributes.position.array)assert(Number.isFinite(v));for(const v of m.geometry.attributes.color.array)assert(v>=0&&v<=1);}
  if(OOZES[name].remains)assert(meshes.some(m=>m.name==='ooze-remains'),`${name} shows what it ate`);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>-.03,`${name} sinks into the floor`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.62,`${name} spreads ${Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)}`);
  heights[name]=b.max.y;
 }
 assert(heights['gray ooze']<heights['acid blob'],'the gray ooze is a puddle');
 assert(heights['black pudding']>heights['brown pudding'],'the black pudding is the biggest pudding');
 assert(heights['blue jelly']<heights['quivering blob']);
 // shared geometry between two of the same kind
 const one=createCreature({name:'black pudding'}),two=createCreature({name:'black pudding'});
 assert.equal(one.body.children[0].geometry,two.body.children[0].geometry);
 // the unnamed ones follow their class letter
 for(const symbol of [98,106,80])assert.equal(createCreature({name:'odd',symbol,color:3}).quirk,'blob');
});
