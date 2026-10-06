import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const AMP=38;// '&'
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}
const box=o=>new THREE.Box3().setFromObject(o);

test('Juiblex rises as a many-eyed column of slime instead of the plain blob',()=>{
 const t0=performance.now(),juiblex=createCreature({name:'Juiblex',symbol:AMP,color:2}),ms=performance.now()-t0;
 // it keeps the blob's quirk and body handle; nothing else to drive
 assert.equal(juiblex.quirk,'blob');
 assert(juiblex.body?.isObject3D);
 assert.equal(juiblex.legs.length,0);assert.equal(juiblex.tail,null);assert.equal(juiblex.wings.length,0);
 const parts=meshes(juiblex);
 assert.deepEqual(parts.map(m=>m.userData.part).sort(),['body','eyes','pool']);
 for(const m of parts){
  const a=m.geometry.attributes;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 // the pool stays on the floor when the body heaves; the eyes heave with the body
 const pool=parts.find(m=>m.userData.part==='pool'),eyes=parts.find(m=>m.userData.part==='eyes');
 assert.equal(pool.parent,juiblex.g);assert.equal(eyes.parent,juiblex.body);
 assert(eyes.material.emissiveIntensity>0);
 juiblex.g.updateMatrixWorld(true);
 const b=box(juiblex.g),column=box(parts.find(m=>m.userData.part==='body'));
 assert(b.min.y>-.08&&column.min.y>=-.001,`sits on the floor: ${b.min.y}, ${column.min.y}`);
 assert(column.max.y>1.05&&column.max.y<1.4,`towers to ${column.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.75,'fits the tile');
 // taller and wider than a plain blob
 const plain=box(createCreature({name:'green slime'}).g);
 assert(column.max.y>plain.max.y*1.5);
 // most eyes look forward (+z)
 const e=eyes.geometry.attributes.position;let front=0;
 for(let i=0;i<e.count;i++)if(e.getZ(i)>0)front++;
 assert(front>e.count*.6,`${front}/${e.count} eye vertices in front`);
 // green slime: the column is more green than red or blue on average
 const col=parts.find(m=>m.userData.part==='body').geometry.attributes.color.array,sum=[0,0,0];
 for(let i=0;i<col.length;i++)sum[i%3]+=col[i];
 assert(sum[1]>sum[0]&&sum[1]>sum[2],`body colour ${sum}`);
 // shared geometry and materials
 const other=meshes(createCreature({name:'juiblex'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
 // the other blobs are unchanged
 assert.equal(createCreature({name:'acid blob'}).quirk,'blob');
});
