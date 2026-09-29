import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeldWeapon} from './equipment.js';
import {missileKind} from './missiles.js';

test('missile names, identified or not, pick their kind; others do not',()=>{
 const cases={'arrow':'arrow','12 arrows':'arrow','runed arrow':'elven arrow','3 elven arrows':'elven arrow','crude arrows':'orcish arrow','orcish arrow':'orcish arrow',
  'silver arrow':'silver arrow','bamboo arrow':'ya','7 ya':'ya','crossbow bolt':'crossbow bolt','6 crossbow bolts':'crossbow bolt','dart':'dart','15 darts':'dart'};
 for(const [name,kind] of Object.entries(cases))assert.equal(missileKind(name),kind,name);
 for(const name of ['sparrow','long sword','bow','crossbow','yari','shuriken'])assert.equal(missileKind(name),null,name);
});

test('arrows, bolts and darts get their own models instead of the leather-stick proxy',()=>{
 const proxy=new THREE.Box3().setFromObject(createHeldWeapon({name:'unknown thing'}));
 const lengths={};
 for(const name of ['arrow','runed arrow','crude arrow','silver arrow','bamboo arrow','crossbow bolt','dart']){
  const g=createHeldWeapon({name}),meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.equal(meshes.length,2,`${name}: a metal mesh and a shaft/feather mesh`);
  assert(meshes.some(m=>m.material.metalness>.5),`${name} has a metal head`);
  for(const m of meshes)for(const k of ['position','normal','color'])for(const v of m.geometry.attributes[k].array)assert(Number.isFinite(v),`${name} ${k}`);
  g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(g);
  // thin, along the weapon axis, gripped between the ends
  assert(b.min.y<0&&b.max.y>0,`${name} grip inside`);
  assert(b.max.x-b.min.x<.1&&b.max.z-b.min.z<.1,`${name} is thin`);
  lengths[name]=b.max.y-b.min.y;
  assert.notDeepEqual(b,proxy);
  let dg=0,dm=0;const geos=new Set(meshes.map(m=>m.geometry)),mats=new Set(meshes.map(m=>m.material));
  geos.forEach(x=>x.addEventListener('dispose',()=>dg++));mats.forEach(x=>x.addEventListener('dispose',()=>dm++));
  g.userData.dispose();assert.equal(dg,geos.size);assert.equal(dm,mats.size);
 }
 // the ya is the longest, then arrows; a bolt is short and a dart shorter still
 assert(lengths['bamboo arrow']>lengths.arrow&&lengths.arrow>lengths['crossbow bolt']&&lengths['crossbow bolt']>lengths.dart,JSON.stringify(lengths));
 // a stack lies as a fan of up to three
 const one=new THREE.Box3().setFromObject(createHeldWeapon({name:'arrow'})),many=new THREE.Box3().setFromObject(createHeldWeapon({name:'20 arrows'}));
 assert(many.max.x-many.min.x>(one.max.x-one.min.x)*1.5,'the stack fans out');
});
