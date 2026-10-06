import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const COLON=58;// ':'
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}
const box=o=>new THREE.Box3().setFromObject(o);

test('crocodiles get their own low armoured model instead of the scaled lizard',()=>{
 const t0=performance.now(),croc=createCreature({name:'crocodile',symbol:COLON,color:2}),ms=performance.now()-t0;
 const baby=createCreature({name:'baby crocodile',symbol:COLON,color:2});
 for(const a of [croc,baby]){
  // it keeps the lizard quirk and the handles the animation layers drive, plus a jaw
  assert.equal(a.quirk,'lizard');
  for(const key of ['body','head','jaw','tail'])assert(a[key]?.isObject3D,key);
  assert.equal(a.legs.length,4);
  const parts=meshes(a);
  assert.equal(parts.length,9,'one mesh per moving part plus the eyes');
  assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['body','eyes','head','jaw','leg','tail']);
  for(const m of parts){
   const at=m.geometry.attributes;
   for(const key of ['position','normal','color'])if(at[key])for(const v of at[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
   if(at.color)for(const v of at.color.array)assert(v>=0&&v<=1,m.userData.part);
  }
  a.g.updateMatrixWorld(true);
  const b=box(a.g);
  // lies on the floor, long and low: the snout leads and the tail trails
  assert(b.min.y>-1e-3&&b.max.y<.26,`height ${b.min.y}..${b.max.y}`);
  assert(b.max.z-b.min.z>3*(b.max.y-b.min.y),'long and low');
  assert(Math.abs(box(a.head).max.z-b.max.z)<1e-6,'snout leads');
  assert(Math.abs(box(a.tail).min.z-b.min.z)<1e-6,'tail trails');
  assert(box(a.jaw).max.z<=box(a.head).max.z+1e-6,'the jaw sits under the head');
  for(const leg of a.legs)assert(box(leg).min.y<.02,'feet on the floor');
 }
 const b=box(croc.g);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.95,'about a tile long');
 assert(box(baby.g).max.z<b.max.z*.7,'the baby is smaller');
 // shared geometry and materials: a second crocodile costs no extra buffers
 const again=meshes(createCreature({name:'crocodile'}));
 meshes(croc).forEach((m,i)=>{assert.equal(m.geometry,again[i].geometry);assert.equal(m.material,again[i].material);});
 assert(ms<1000,`took ${ms} ms`);
 // the other lizards are unchanged
 assert.equal(createCreature({name:'iguana',symbol:COLON}).legs.length,4);
 assert(!meshes(createCreature({name:'iguana',symbol:COLON})).some(m=>m.userData.part==='jaw'));
});
