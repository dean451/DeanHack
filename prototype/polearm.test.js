import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeldWeapon} from './equipment.js';

const meshes=g=>{const l=[];g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
const proxy=createHeldWeapon({name:'unknown polearm thing'});

for(const [name,kind] of [['pole sickle','fauchard'],['fauchard','fauchard'],['lance','lance'],['+2 lance (weapon in hand)','lance']]){
 test(`${name} gets the ${kind} model instead of the leather-stick proxy`,()=>{
  const g=createHeldWeapon({name}),parts=meshes(g);
  assert(parts.length>meshes(proxy).length+10,`${name}: ${parts.length} meshes`);
  for(const m of parts)for(const v of m.geometry.attributes.position.array)assert(Number.isFinite(v),name);
  g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(g);
  // gripped at the origin, reaching up the weapon axis, butt behind the hand
  assert(b.min.y<-.3&&b.min.y>-.5,`${name} butt at ${b.min.y}`);
  if(kind==='fauchard'){
   assert(b.max.y>1.3&&b.max.y<1.5,`${name} top at ${b.max.y}`);
   // the sickle hooks forward in +x and stays thin, so it lies flat on the floor
   assert(b.max.x>.25&&b.max.x<.35,`${name} blade reach ${b.max.x}`);
  }else{
   assert(b.max.y>1.7&&b.max.y<1.9,`${name} tip at ${b.max.y}`);
   assert(b.max.x>.25,'the pennon flies out to the side');
   // the vamplate is wider than the shaft
   assert(b.max.z>.13&&b.max.z<.16,`${name} vamplate ${b.max.z}`);
  }
  assert(b.max.z-b.min.z<.35,'thin across the blade plane');
  // disposal frees every geometry and material
  const geos=new Set(parts.map(m=>m.geometry)),mats=new Set(parts.map(m=>m.material));let dg=0,dm=0;
  geos.forEach(x=>x.addEventListener('dispose',()=>dg++));mats.forEach(x=>x.addEventListener('dispose',()=>dm++));
  g.userData.dispose();
  assert.equal(dg,geos.size);assert.equal(dm,mats.size,`${name}: every material disposed`);
 });
}
