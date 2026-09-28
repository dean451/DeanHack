import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const I=105;// 'i'
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}

test('the homunculus gets its own bat-winged, pot-bellied model instead of the tinted imp',()=>{
 const t0=performance.now(),hom=createCreature({name:'homunculus',symbol:I,color:2}),ms=performance.now()-t0;
 const imp=createCreature({name:'imp',symbol:I,color:1});
 assert.equal(hom.quirk,'homunculus');
 // the handles the animation layers drive
 for(const key of ['body','head','arm','tail'])assert(hom[key]?.isObject3D,key);
 assert.equal(hom.legs.length,2);assert.equal(hom.arms.length,2);assert.equal(hom.wings.length,2);
 assert(hom.arms.includes(hom.arm));
 assert.deepEqual(hom.wings.map(w=>w.userData.side),[-1,1]);
 const parts=meshes(hom);
 assert.equal(parts.length,10,'one mesh per moving part plus the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['arm','body','eyes','head','leg','tail','wing']);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 hom.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(hom.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>.75&&b.max.y<1,`top at ${b.max.y}`);// smaller than the imp
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'fits the tile');
 // the wings spread wider than the body, and the two are mirror images
 const wl=new THREE.Box3().setFromObject(hom.wings[0]),wr=new THREE.Box3().setFromObject(hom.wings[1]);
 assert(wr.max.x>.35&&wl.min.x<-.35,`wings reach ${wl.min.x} ${wr.max.x}`);
 assert(Math.abs(wr.max.x+wl.min.x)<1e-4);
 // shared geometry and materials
 const other=meshes(createCreature({name:'homunculus'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<200,`took ${ms} ms`);
 // the other minor demons are unchanged
 assert.equal(imp.quirk,'imp');
 assert.equal(createCreature({name:'quasit',symbol:I,color:4}).quirk,'imp');
 assert.equal(createCreature({name:'tengu',symbol:I,color:6}).quirk,'tengu');
});
