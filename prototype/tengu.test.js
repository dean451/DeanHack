import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const I=105;// 'i'
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}

test('the tengu gets its own long-nosed, crow-winged model instead of the tinted imp',()=>{
 const t0=performance.now(),tengu=createCreature({name:'tengu',symbol:I,color:6}),ms=performance.now()-t0;
 const imp=createCreature({name:'imp',symbol:I,color:1});
 assert.equal(tengu.quirk,'tengu');
 // the handles the animation layers drive
 for(const key of ['body','head','arm'])assert(tengu[key]?.isObject3D,key);
 assert.equal(tengu.legs.length,2);assert.equal(tengu.arms.length,2);assert.equal(tengu.wings.length,2);
 assert(tengu.arms.includes(tengu.arm));
 assert.deepEqual(tengu.wings.map(w=>w.userData.side),[-1,1]);
 const parts=meshes(tengu);
 assert.equal(parts.length,9,'one mesh per moving part plus the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['arm','body','eyes','head','leg','wing']);
 assert.notEqual(parts.length,meshes(imp).length,'still the imp');
 for(const m of parts){
  const a=m.geometry.attributes;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 tengu.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(tengu.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1&&b.max.y<1.3,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'fits the tile');
 // the nose is the frontmost part of the head
 const head=new THREE.Box3().setFromObject(tengu.head);
 assert(head.max.z>.35,`nose reaches ${head.max.z}`);
 // shared geometry and materials: a room of tengu costs no extra buffers
 const other=meshes(createCreature({name:'tengu'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<200,`took ${ms} ms`);
 // the other minor demons are unchanged
 assert.equal(imp.quirk,'imp');
 assert.equal(createCreature({name:'quasit',symbol:I,color:4}).quirk,'imp');
});
