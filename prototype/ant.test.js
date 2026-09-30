import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('ants get a jointed six-legged body with a turning head, jaws, feelers and a banded gaster',()=>{
 const sizes={};
 for(const [name,extra] of [['giant ant',{}],['soldier ant',{symbol:97,color:4}],['fire ant',{}],['army ant',{symbol:97,color:3}]]){
  const a=createCreature({name,...extra});
  assert.equal(a.quirk,'insect',name);
  assert.equal(a.legs.length,6,name);
  assert(a.body?.isObject3D&&a.head?.isObject3D,name);
  assert(a.head.children.some(o=>o.isMesh),`${name}: the head handle carries the head mesh`);
  const parts=meshes(a);
  assert.equal(parts.length,8,`${name}: head, body and one mesh per leg`);
  assert.equal(new Set(parts.map(m=>m.material)).size,1,`${name}: one material`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of at.color.array)assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<25000,`${name}: ${verts} vertices`);
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(Math.abs(b.min.y)<.02,`${name} feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`${name} fits the tile: ${JSON.stringify(b)}`);
  // the head sits in front of the body and the legs mirror each other
  const hb=new THREE.Box3().setFromObject(a.head);
  assert(hb.max.z>b.max.z-.01,`${name}: the jaws are the front of the ant`);
  const lx=a.legs.map(l=>new THREE.Box3().setFromObject(l)).map(bb=>(bb.min.x+bb.max.x)/2);
  for(let i=0;i<3;i++)assert(Math.abs(lx[i]+lx[i+3])<1e-6,`${name} leg ${i} mirrored`);
  sizes[name]=b.max.z-b.min.z;
 }
 assert(sizes['soldier ant']>sizes['fire ant'],'the soldier ant is bigger than the fire ant');
 // geometry and materials are shared between ants of the same kind; bees and beetles stay insects
 const [x,y]=[createCreature({name:'fire ant'}),createCreature({name:'fire ant'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
 assert.equal(createCreature({name:'killer bee'}).quirk,'bee');
 assert.notEqual(meshes(createCreature({name:'giant beetle'})).length,8);
});
