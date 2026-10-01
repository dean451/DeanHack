import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const I=105;// 'i'
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}

test('the imp gets its own goat-legged, bat-winged, spade-tailed model instead of the generic humanoid',()=>{
 const t0=performance.now(),imp=createCreature({name:'imp',symbol:I,color:1}),ms=performance.now()-t0;
 assert.equal(imp.quirk,'imp');
 for(const key of ['body','head','arm','tail'])assert(imp[key]?.isObject3D,key);
 assert.equal(imp.legs.length,2);assert.equal(imp.arms.length,2);assert.equal(imp.wings.length,2);
 assert(imp.arms.includes(imp.arm));
 assert.deepEqual(imp.wings.map(w=>w.userData.side),[-1,1]);
 const parts=meshes(imp);
 assert.equal(parts.length,10,'one mesh per moving part plus the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['arm','body','eyes','head','leg','tail','wing']);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 imp.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(imp.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>.8&&b.max.y<1.05,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'fits the tile');
 // both hooves rest on the floor, the tail trails behind, and the wings are mirror images
 for(const leg of imp.legs){const l=new THREE.Box3().setFromObject(leg);assert(l.min.y>-.03&&l.min.y<.03,`hoof at ${l.min.y}`);}
 const tail=new THREE.Box3().setFromObject(imp.tail);
 assert(tail.min.z<-.3,`tail reaches z ${tail.min.z}`);assert(tail.min.y>0,`tail at ${tail.min.y}`);
 const wl=new THREE.Box3().setFromObject(imp.wings[0]),wr=new THREE.Box3().setFromObject(imp.wings[1]);
 assert(wr.max.x>.25&&wl.min.x<-.25,`wings reach ${wl.min.x} ${wr.max.x}`);
 assert(Math.abs(wr.max.x+wl.min.x)<1e-4);
 const other=meshes(createCreature({name:'imp'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
 // the other minor demons keep their own models
 for(const [name,quirk] of [['homunculus','homunculus'],['quasit','quasit'],['tengu','tengu']])assert.equal(createCreature({name,symbol:I}).quirk,quirk);
});

test('the uranium imp is the imp gone radioactive: livid green, with glowing ore horns, shards and veins',()=>{
 const imp=createCreature({name:'uranium imp',symbol:I,color:10}),red=createCreature({name:'imp',symbol:I,color:1});
 assert.equal(imp.quirk,'imp');
 for(const key of ['body','head','arm','tail'])assert(imp[key]?.isObject3D,key);
 assert.equal(imp.legs.length,2);assert.equal(imp.arms.length,2);assert.equal(imp.wings.length,2);
 const parts=meshes(imp),redParts=meshes(red);
 assert.equal(parts.length,11,'the red imp\'s 10 draws plus the body glow');
 const glow=parts.find(m=>m.userData.part==='glow'),eyes=parts.find(m=>m.userData.part==='eyes');
 assert.equal(glow.parent,imp.body);assert.equal(glow.material,eyes.material);
 assert(glow.material.emissive.g>glow.material.emissive.r,'the glow is green');
 for(const m of parts){
  assert(!redParts.some(r=>r.geometry===m.geometry),`${m.userData.part} has its own geometry`);
  const a=m.geometry.attributes;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
 }
 // the hide is green, not red
 const c=parts.find(m=>m.userData.part==='body').geometry.attributes.color.array;
 let r=0,g=0;for(let i=0;i<c.length;i+=3){r+=c[i];g+=c[i+1];}
 assert(g>r,`body colour r ${r} g ${g}`);
 // the ore horns stand out above the red imp's horns, and the wings have holes (more triangles)
 imp.g.updateMatrixWorld(true);red.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(imp.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>.85&&b.max.y<1.1,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'fits the tile');
 const wing=m=>m.find(p=>p.userData.part==='wing').geometry.attributes.position.count;
 assert(wing(parts)>wing(redParts),'holes in the wings');
 const again=meshes(createCreature({name:'uranium imp'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,again[i].geometry);assert.equal(m.material,again[i].material);});
});
