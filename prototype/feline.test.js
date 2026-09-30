import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {foreLegs} from './monster-attacks.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
const NAMES=['kitten','housecat','large cat','jaguar','lynx','panther','tiger','displacer beast'];

test('cats get a shaped torso, a turning head with ears and whiskers, jointed legs, a tail and a painted coat',()=>{
 const sizes={};
 for(const [name,extra] of [...NAMES.map(n=>[n,{}]),['wildcat',{symbol:102,color:3}]]){
  const a=createCreature({name,...extra});
  assert.equal(a.quirk,'feline',name);
  assert.equal(a.legs.length,4,name);
  assert(a.body?.isObject3D&&a.head?.isObject3D&&a.tail?.isObject3D,name);
  assert(a.head.children.some(o=>o.isMesh&&o.userData.part==='head'),`${name}: the head handle carries the head`);
  assert(a.tail.children.some(o=>o.isMesh),`${name}: the tail handle carries the tail`);
  const parts=meshes(a);
  assert.equal(parts.length,8,`${name}: body, head, eyes, four legs and the tail`);
  assert.equal(new Set(parts.map(m=>m.material)).size,2,`${name}: fur and eyes`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of at.color.array)assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<36000,`${name}: ${verts} vertices`);
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(Math.abs(b.min.y)<.02,`${name} feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x)<.5,`${name} width ${JSON.stringify(b)}`);
  assert(Math.max(-b.min.z,b.max.z)<.95,`${name} length ${JSON.stringify(b)}`);
  // the head leads, the forelegs are the front pair (the pounce and swipe lift them)
  const hb=new THREE.Box3().setFromObject(a.head);
  assert(hb.max.z>b.max.z-.01,`${name}: the nose is the front of the cat`);
  assert.equal(foreLegs(a).length,2,`${name}: two forelegs`);
  const lx=a.legs.map(l=>new THREE.Box3().setFromObject(l)).map(bb=>(bb.min.x+bb.max.x)/2);
  assert(Math.abs(lx[0]+lx[2])<1e-6&&Math.abs(lx[1]+lx[3])<1e-6,`${name}: legs mirrored`);
  sizes[name]=b.max.z-b.min.z;
 }
 assert(sizes.tiger>sizes.housecat&&sizes.housecat>sizes.kitten,'tiger > housecat > kitten');
 // the coat is actually painted: a tiger's torso has both orange and near-black vertices
 const tiger=meshes(createCreature({name:'tiger'})).find(m=>m.userData.part==='body').geometry.attributes.color;
 let dark=0,orange=0;
 for(let i=0;i<tiger.count;i++){const r=tiger.getX(i),g=tiger.getY(i),b=tiger.getZ(i);if(r+g+b<.3)dark++;if(r>.6&&b<.3)orange++;}
 assert(dark>200&&orange>200,`tiger stripes: ${dark} dark, ${orange} orange`);
 // geometry and materials are shared between cats of one kind; kinds differ
 const [x,y]=[createCreature({name:'jaguar'}),createCreature({name:'jaguar'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
 assert.notEqual(meshes(createCreature({name:'panther'}))[0].geometry,x[0].geometry);
});
