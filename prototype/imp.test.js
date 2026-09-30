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
