import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('the giant beetle gets domed wing cases, a shield, toothed jaws, a turning head and six stout legs',()=>{
 const a=createCreature({name:'giant beetle',symbol:'a'.charCodeAt(0),color:0});
 assert.equal(a.quirk,'insect');
 assert.equal(a.legs.length,6);
 assert.equal(a.wings.length,0);
 assert(a.head?.children.some(o=>o.isMesh),'the head handle carries the head mesh');
 const parts=meshes(a);
 assert.equal(parts.length,8,'body, head and 6 legs');
 assert.equal(new Set(parts.map(m=>m.material)).size,1,'one material');
 let verts=0;
 for(const m of parts){
  const at=m.geometry.attributes;verts+=at.position.count;
  for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of at.color.array)assert(v>=0&&v<=1,'colour');
 }
 assert(verts<28000,`${verts} vertices`);
 a.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(a.g);
 assert(Math.abs(b.min.y)<.02,`the feet stand on the floor: ${b.min.y}`);
 assert(b.max.y<.45,`height ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`fits the tile: ${JSON.stringify(b)}`);
 const hb=new THREE.Box3().setFromObject(a.head);
 assert(hb.max.z>b.max.z-.01,'the jaws are the front of the beetle');
 // every foot reaches the floor, and the legs mirror each other
 for(const l of a.legs)assert(new THREE.Box3().setFromObject(l).min.y<.02,'a foot off the floor');
 const lx=a.legs.map(l=>new THREE.Box3().setFromObject(l)).map(bb=>(bb.min.x+bb.max.x)/2);
 for(let i=0;i<3;i++)assert(Math.abs(lx[i]+lx[i+3])<1e-6,`leg ${i} mirrored`);
 // geometry and the material are shared between beetles
 const [x,y]=[a,createCreature({name:'giant beetle'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
});
