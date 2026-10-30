import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GOBLINS,createGoblin} from './goblin.js';
import {ORCS,createOrc} from './orc.js';

const FAMILY=[...GOBLINS.map(n=>[n,()=>createGoblin(n)]),...ORCS.map(n=>[n,()=>createOrc(n)])];
const eyeAt=a=>{a.eyes.geometry.computeBoundingBox();return a.eyes.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(a.eyes.matrixWorld);};
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const under=(o,root)=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};

test('every goblin and orc exposes head, neck0, both arms and both legs as named joints',()=>{
 assert(FAMILY.length>=6);
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,name);
  assert.equal(a.head.name,'head',name);
  for(const side of ['l','r'])for(const [stem,list] of [['fore',a.arms],['leg1',a.legs]]){
   const o=j[side+stem];
   assert(o&&list.includes(o),`${name}: ${side}${stem}`);
   assert.equal(o.position.x<0,side==='l',`${name}: left is -x`);
   assert.equal(o.name,side+stem,name);
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length-1,`${name}: every joint its own (neck0 is the head group)`);
  assert(under(a.weaponSocket,j.rfore),`${name}: the weapon rides the right arm`);
 }
});

test('turning an arm or a hip moves that limb only; the head carries only its face',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  a.g.updateMatrixWorld(true);
  const socket=world(a.weaponSocket),eyes=eyeAt(a),hip=world(j.lleg1);
  j.rfore.rotation.x+=.6;a.g.updateMatrixWorld(true);
  assert(world(a.weaponSocket).distanceTo(socket)>.01,`${name}: the weapon follows the arm`);
  j.rfore.rotation.x-=.6;
  j.lleg1.rotation.x+=.6;a.g.updateMatrixWorld(true);
  assert(world(a.weaponSocket).distanceTo(socket)<1e-9,`${name}: a hip leaves the weapon`);
  assert(world(j.lleg1).distanceTo(hip)<1e-9,`${name}: the hip pivot stays`);
  j.lleg1.rotation.x-=.6;
  j.head.rotation.x+=.5;a.g.updateMatrixWorld(true);
  assert(eyeAt(a).distanceTo(eyes)>.005,`${name}: the eyes follow the head`);
  assert(world(a.weaponSocket).distanceTo(socket)<1e-9,`${name}: the head leaves the weapon`);
 }
});
