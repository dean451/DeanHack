import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('ants get a jointed six-legged body with a turning head, jaws, feelers and a banded gaster',()=>{
 const sizes={};
 for(const [name,extra] of [['giant ant',{}],['soldier ant',{symbol:97,color:4}],['fire ant',{}],['snow ant',{symbol:97,color:6}],['army ant',{symbol:97,color:3}]]){
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
 // geometry and materials are shared between ants of the same kind; bees and the beetle have their own builds
 const [x,y]=[createCreature({name:'fire ant'}),createCreature({name:'fire ant'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
 assert.equal(createCreature({name:'killer bee'}).quirk,'bee');
 assert.notEqual(meshes(createCreature({name:'giant beetle'}))[0].geometry,x[0].geometry);
});

test('the snow ant has its own frosted build, not the giant ant tinted cyan',()=>{
 const snow=meshes(createCreature({name:'snow ant',symbol:97,color:6})),giant=meshes(createCreature({name:'giant ant'}));
 const verts=l=>l.reduce((n,m)=>n+m.geometry.attributes.position.count,0);
 assert.notEqual(snow[0].geometry,giant[0].geometry);
 assert(verts(snow)>verts(giant)+800,'rime shards and icicles add geometry');
 // hoarfrost: a good share of near-white vertices on the body, which the giant ant has none of
 const white=m=>{const c=m.geometry.attributes.color.array;let n=0;for(let i=0;i<c.length;i+=3)if(c[i]>.85&&c[i+1]>.9&&c[i+2]>.92)n++;return n/(c.length/3);};
 assert(white(snow[0])>.05,`snow ant body frost ${white(snow[0])}`);
 assert.equal(white(giant[0]),0);
 // the shell is cold: blue over red on average
 const avg=m=>{const c=m.geometry.attributes.color.array,s=[0,0,0];for(let i=0;i<c.length;i++)s[i%3]+=c[i];return s;};
 const [r,,b]=avg(snow[0]);assert(b>r,'blue shell');
 assert(snow[0].material.roughness<giant[0].material.roughness,'glossy ice');
});

test('the locust has its own build: folded wings, jumping hind legs and a hooded head, not a grey ant',()=>{
 const a=createCreature({name:'locust',symbol:97,color:7}),ant=createCreature({name:'giant ant'});
 assert.equal(a.quirk,'insect');
 assert.equal(a.legs.length,6);
 assert(a.head.children.some(o=>o.isMesh),'the head handle carries the head mesh');
 const parts=meshes(a);
 assert.equal(parts.length,8,'head, body and one mesh per leg');
 assert.equal(new Set(parts.map(m=>m.material)).size,1,'one material');
 assert.notEqual(parts[0].geometry,meshes(ant)[0].geometry);
 let verts=0;
 for(const m of parts){
  const at=m.geometry.attributes;verts+=at.position.count;
  for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of at.color.array)assert(v>=0&&v<=1,'colour');
 }
 assert(verts<30000,`${verts} vertices`);
 a.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(a.g);
 assert(Math.abs(b.min.y)<.02,`feet at ${b.min.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`fits the tile: ${JSON.stringify(b)}`);
 // the hind legs are the big ones: their knees rise above the folded wings, well behind the hips
 const legBoxes=a.legs.map(l=>new THREE.Box3().setFromObject(l));
 const body=new THREE.Box3().setFromObject(a.body.children[0]);
 for(const i of [2,5]){
  assert(legBoxes[i].max.y>body.max.y,`hind leg ${i} knee above the wings`);
  assert(legBoxes[i].min.z<a.legs[i].getWorldPosition(new THREE.Vector3()).z-.15,`hind leg ${i} reaches back`);
 }
 for(let i=0;i<3;i++){const c=x=>(legBoxes[x].min.x+legBoxes[x].max.x)/2;assert(Math.abs(c(i)+c(i+3))<1e-6,`leg ${i} mirrored`);}
 // a long insect: the wings run well past the hind hips
 assert(b.max.z-b.min.z>.6,'long body');
 // shared geometry between locusts
 const [x,y]=[a,createCreature({name:'locust'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
});
