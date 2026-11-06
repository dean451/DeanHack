import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NAMES=['baby long worm','long worm','baby purple worm','purple worm','remorhaz'];
const make=name=>createCreature({name,symbol:'w'.charCodeAt(0),color:7});
const under=(o,root)=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};

test('every worm has a neck and a head as named joints',()=>{
 for(const name of NAMES){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.neck0,a.tail,`${name}: neck0 is the swaying half`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0.name,'neck0');assert.equal(j.head.name,'head');
  assert(under(j.head,j.neck0),`${name}: the head rides the neck`);
  assert(!under(a.body,j.neck0),`${name}: the rear is not on the neck`);
 }
});

test('turning the neck carries the head and leaves the rear where it was',()=>{
 for(const name of NAMES){
  const a=make(name);a.g.updateMatrixWorld(true);
  const head0=world(a.joints.head),rear=a.body.children.filter(c=>!under(c,a.joints.neck0)),rear0=rear.map(world);
  a.joints.neck0.rotation.x+=.4;a.g.updateMatrixWorld(true);
  assert(world(a.joints.head).distanceTo(head0)>.01,`${name}: the head moved`);
  rear.forEach((c,i)=>assert(world(c).distanceTo(rear0[i])<1e-9,`${name}: the rear stayed`));
 }
});
