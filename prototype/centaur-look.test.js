import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// Review 2026-11-11: the centaurs' man read as a smooth toy doll (capsule arms, ball mitten hands, sphere
// shoulder caps, round dot eyes, a clean pastel tube top). These pin the faceted look.
const NAMES=['plains centaur','forest centaur','mountain centaur'];
const make=name=>createCreature({name,symbol:67,color:3});
const meshes=o=>{const m=[];o.traverse(x=>{if(x.isMesh)m.push(x);});return m;};
// a fist is the hand's own group (the weapon's parts sit beside it); the last group child is the fist
const fistOf=hand=>hand.children.filter(c=>!c.isMesh).at(-1);

test('the centaur man is flat shaded: arms, hands and face are faceted, not smooth',()=>{
 for(const name of NAMES){
  const a=make(name);
  for(const arm of a.arms)for(const m of meshes(arm)){
   const hand=arm.name[0]==='r'?a.weaponSocket:a.offHand;
   if(hand.getObjectById(m.id)&&!fistOf(hand).getObjectById(m.id))continue; // the weapon itself
   assert(m.material.flatShading,`${name}: ${arm.name} part is flat shaded`);
  }
  const face=meshes(a.head).filter(m=>m.material.flatShading);
  assert(face.length>=1,`${name}: the head is faceted`);
 }
});

test('every centaur hand is a fist of fingers wrapped right round its grip',()=>{
 for(const name of NAMES){
  const a=make(name);
  for(const hand of [a.weaponSocket,a.offHand]){
   const fist=fistOf(hand);assert(fist,`${name}: a fist`);
   // the fist's vertices, in its own frame (the grip runs along y): count which of eight sectors round the grip they fill
   const sectors=new Set(),v=new THREE.Vector3();
   fist.updateMatrixWorld(true);const inv=fist.matrixWorld.clone().invert();
   for(const m of meshes(fist)){const p=m.geometry.attributes.position;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
     if(Math.hypot(v.x,v.z)>.008)sectors.add(Math.floor((Math.atan2(v.z,v.x)+Math.PI)/(Math.PI/4))%8);}}
   assert(sectors.size>=7,`${name}: the fingers and thumb close round the grip (${sectors.size} of 8 sides)`);
  }
 }
 // the club still hangs first from the fist (centaur-weapons.test.js), and the fist comes after it
 const club=make('mountain centaur').weaponSocket;assert(club.children.indexOf(fistOf(club))>0);
});
