import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('bees get a fuzzy banded body, a turning head, dangling legs and veined glass wings',()=>{
 const len={};
 for(const name of ['killer bee','queen bee']){
  const a=createCreature({name});
  assert.equal(a.quirk,'bee',name);
  assert.equal(a.legs.length,6,name);
  assert.equal(a.wings.length,2,name);
  assert.deepEqual(a.wings.map(w=>w.userData.side),[-1,1],`${name}: left wing first`);
  assert(a.head?.children.some(o=>o.isMesh),`${name}: the head handle carries the head mesh`);
  const parts=meshes(a);
  assert.equal(parts.length,12,`${name}: body, head, 6 legs, membrane and veins per wing side`);
  assert.equal(new Set(parts.map(m=>m.material)).size,2,`${name}: the body material and the wing glass`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(at.color)for(const v of at.color.array)assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<26000,`${name}: ${verts} vertices`);
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>.15,`${name} hovers: ${b.min.y}`);
  assert(b.max.y<.75,`${name} height ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`${name} fits the tile: ${JSON.stringify(b)}`);
  const hb=new THREE.Box3().setFromObject(a.head);
  assert(hb.max.z>b.max.z-.01,`${name}: the head is the front of the bee`);
  // wings mirror each other and sit above the legs
  const [wl,wr]=a.wings.map(w=>new THREE.Box3().setFromObject(w));
  assert(Math.abs(wl.min.x+wr.max.x)<1e-6&&Math.abs(wl.max.y-wr.max.y)<1e-6,`${name} wings mirrored`);
  const lx=a.legs.map(l=>new THREE.Box3().setFromObject(l)).map(bb=>(bb.min.x+bb.max.x)/2);
  for(let i=0;i<3;i++)assert(Math.abs(lx[i]+lx[i+3])<1e-6,`${name} leg ${i} mirrored`);
  len[name]=b.max.z-b.min.z;
 }
 assert(len['queen bee']>len['killer bee']*1.4,'the queen is much longer than a killer bee');
 // geometry and materials are shared between bees of the same kind
 const [x,y]=[createCreature({name:'killer bee'}),createCreature({name:'killer bee'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
});
