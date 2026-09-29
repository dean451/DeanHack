import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const APOS=39;// "'"
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}
const box=o=>new THREE.Box3().setFromObject(o);

test('the giant turtle gets its own tortoise with a scuted shell instead of the dome and blobs',()=>{
 const t0=performance.now(),a=createCreature({name:'giant turtle',symbol:APOS,color:2}),ms=performance.now()-t0;
 // it keeps the turtle quirk and the handles the animation layers drive, plus a head
 assert.equal(a.quirk,'turtle');
 for(const key of ['body','head','tail'])assert(a[key]?.isObject3D,key);
 assert.equal(a.legs.length,4);
 const parts=meshes(a);
 assert.equal(parts.length,7,'one mesh per moving part');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['body','head','leg','tail']);
 assert.equal(new Set(parts.map(m=>m.material)).size,1,'one shared material');
 for(const m of parts){
  const at=m.geometry.attributes;
  for(const key of ['position','normal','color'])for(const v of at[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of at.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 a.g.updateMatrixWorld(true);
 const b=box(a.g),shell=box(parts.find(m=>m.userData.part==='body'));
 // stands on its feet with the plastron clear of the floor; the shell is the top
 assert(b.min.y>-1e-3,`floor ${b.min.y}`);
 for(const leg of a.legs)assert(box(leg).min.y<.01,'feet on the floor');
 assert(shell.min.y>.04,'plastron off the floor');
 assert(Math.abs(shell.max.y-b.max.y)<1e-6,'the shell is the highest point');
 assert(Math.abs(box(a.head).max.z-b.max.z)<1e-6,'head leads');
 assert(Math.abs(box(a.tail).min.z-b.min.z)<1e-6,'tail trails');
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.6,'about a tile');
 // the scutes show: the top of the shell has both pale areolae and dark seams
 const col=parts.find(m=>m.userData.part==='body').geometry.attributes.color.array;
 let dark=0,pale=0;for(let i=0;i<col.length;i+=3){if(col[i]<.03)dark++;if(col[i]>.25)pale++;}
 assert(dark>100&&pale>100,`${dark} seam, ${pale} areola vertices`);
 // shared geometry: a second turtle costs no extra buffers
 const again=meshes(createCreature({name:'giant turtle'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert(ms<1000,`took ${ms} ms`);
});
