import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const B=66;// 'B'
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}

test('the raven gets its own glossy black bird instead of the bat',()=>{
 const t0=performance.now(),raven=createCreature({name:'raven',symbol:B,color:0}),ms=performance.now()-t0;
 const bat=createCreature({name:'bat',symbol:B,color:3});
 // it keeps the bat's flap and hover, and the handles the animation layers drive
 assert.equal(raven.quirk,'bat');
 for(const key of ['body','head','tail'])assert(raven[key]?.isObject3D,key);
 assert.equal(raven.legs.length,2);assert.equal(raven.wings.length,2);
 assert.deepEqual(raven.wings.map(w=>w.userData.side),[-1,1]);
 const parts=meshes(raven);
 assert.equal(parts.length,8,'one mesh per moving part plus the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['body','eyes','head','leg','tail','wing']);
 assert(!meshes(bat).some(m=>m.userData.part==='wing'),'still the bat');
 for(const m of parts){
  const a=m.geometry.attributes;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 raven.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(raven.g);
 assert(b.min.y>.3&&b.max.y<.7,`flies at ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'fits the tile');
 // a broad wingspan, and the beak is the frontmost part
 assert(b.max.x-b.min.x>.6,`span ${b.max.x-b.min.x}`);
 const wing=new THREE.Box3().setFromObject(raven.wings[1]);
 assert(wing.max.x>.3&&wing.min.x>0,`right wing ${wing.min.x}..${wing.max.x}`);
 const head=new THREE.Box3().setFromObject(raven.head);
 assert(Math.abs(head.max.z-b.max.z)<1e-6,'beak leads');
 const tail=new THREE.Box3().setFromObject(raven.tail);
 assert(Math.abs(tail.min.z-b.min.z)<1e-6,'tail trails');
 // a black bird: the plumage averages dark
 const body=parts.find(m=>m.userData.part==='body').geometry.attributes.color.array;
 let sum=0;for(const v of body)sum+=v;assert(sum/body.length<.15,`body brightness ${sum/body.length}`);
 // shared geometry and materials: a flock costs no extra buffers
 const other=meshes(createCreature({name:'raven'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<200,`took ${ms} ms`);
 // the bats are unchanged
 assert.equal(bat.quirk,'bat');
 assert.equal(meshes(createCreature({name:'giant bat',symbol:B})).length,meshes(bat).length);
});
