import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {foreLegs} from './monster-attacks.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh&&o.userData.part!=='flame')l.push(o);});return l;};
const NAMES=['jackal','werejackal','coyote','fox','wolf','warg','hell hound pup','hell hound'];

test('wild dogs get a shaped torso, a turning head with a muzzle and ears, jointed legs, a brush tail and a painted coat',()=>{
 const sizes={};
 for(const [name,extra] of [...NAMES.map(n=>[n,{}]),['dingo',{symbol:100,color:3}]]){
  const a=createCreature({name,...extra});
  assert.equal(a.quirk,'canine',name);
  assert.equal(a.legs.length,4,name);
  assert(a.body?.isObject3D&&a.head?.isObject3D&&a.tail?.isObject3D,name);
  assert(a.head.children.some(o=>o.isMesh&&o.userData.part==='head'),`${name}: the head handle carries the head`);
  assert(a.tail.children.some(o=>o.isMesh&&o.userData.part==='tail'),`${name}: the tail handle carries the tail`);
  const parts=meshes(a);
  assert.equal(parts.length,8,`${name}: body, head, eyes, four legs and the tail`);
  assert.equal(new Set(parts.map(m=>m.material)).size,2,`${name}: fur and eyes`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(at.color)for(const v of at.color.array)assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3();for(const m of parts)b.expandByObject(m);
  assert(Math.abs(b.min.y)<.02,`${name} feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x)<.5,`${name} width ${JSON.stringify(b)}`);
  assert(Math.max(-b.min.z,b.max.z)<.95,`${name} length ${JSON.stringify(b)}`);
  const hb=new THREE.Box3().setFromObject(a.head);
  assert(hb.max.z>b.max.z-.01,`${name}: the nose is the front of the dog`);
  assert.equal(foreLegs(a).length,2,`${name}: two forelegs`);
  const lx=a.legs.map(l=>new THREE.Box3().setFromObject(l)).map(bb=>(bb.min.x+bb.max.x)/2);
  assert(Math.abs(lx[0]+lx[2])<1e-6&&Math.abs(lx[1]+lx[3])<1e-6,`${name}: legs mirrored`);
  sizes[name]=b.max.y;
 }
 assert(sizes.warg>sizes.wolf&&sizes.wolf>sizes.jackal&&sizes.jackal>sizes.fox,'warg > wolf > jackal > fox');
 // the coat is painted: a fox's torso is mostly red with a white belly and chest
 const fox=meshes(createCreature({name:'fox'})).find(m=>m.userData.part==='body').geometry.attributes.color;
 let red=0,white=0;
 for(let i=0;i<fox.count;i++){const r=fox.getX(i),g=fox.getY(i),bl=fox.getZ(i);if(r>.5&&bl<.25)red++;if(g>.6&&bl>.5)white++;}
 assert(red>300&&white>100,`fox coat: ${red} red, ${white} white`);
 // geometry and materials are shared between dogs of one kind; kinds differ
 const [x,y]=[createCreature({name:'wolf'}),createCreature({name:'wolf'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
 assert.notEqual(meshes(createCreature({name:'coyote'}))[0].geometry,x[0].geometry);
});
