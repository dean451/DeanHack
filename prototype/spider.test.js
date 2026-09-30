import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('cave and giant spiders get a jointed eight-legged body with fangs and eyes, standing on the floor',()=>{
 const sizes={};
 for(const [name,extra] of [['cave spider',{}],['giant spider',{}],['recluse',{symbol:115,color:3}]]){
  const s=createCreature({name,...extra});
  assert.equal(s.quirk,'spider',name);
  assert.equal(s.legs.length,8,name);
  assert(s.body?.isObject3D&&s.head?.isMesh,name);
  const parts=meshes(s);
  assert.equal(parts.length,10,`${name}: body, eyes and one mesh per leg`);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<30000,`${name}: ${verts} vertices`);
  s.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(s.g);
  assert(Math.abs(b.min.y)<.02,`${name} feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.95,`${name} too wide`);
  // the legs mirror each other across the body
  const lx=s.legs.map(l=>new THREE.Box3().setFromObject(l)).map(bb=>(bb.min.x+bb.max.x)/2);
  for(let i=0;i<4;i++)assert(Math.abs(lx[i]+lx[i+4])<1e-6,`${name} leg ${i} mirrored`);
  sizes[name]=b.max.y;
 }
 assert(sizes['giant spider']>sizes['cave spider']*2,'the giant spider towers over the cave spider');
 // geometry and materials are shared between spiders of the same kind
 const [a,b]=[createCreature({name:'cave spider'}),createCreature({name:'cave spider'})].map(meshes);
 a.forEach((m,i)=>{assert.equal(m.geometry,b[i].geometry);assert.equal(m.material,b[i].material);});
});
