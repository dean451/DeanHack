import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const S=83;// 'S'
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}
const box=o=>new THREE.Box3().setFromObject(o);

test('the couatl gets its own feathered, winged serpent instead of the plain snake',()=>{
 const t0=performance.now(),couatl=createCreature({name:'couatl',symbol:S,color:2}),ms=performance.now()-t0;
 // it flies, so it takes the hover bob and wing sway, and keeps the handles the animation layers drive
 assert.equal(couatl.quirk,'hover');
 for(const key of ['body','head','tail'])assert(couatl[key]?.isObject3D,key);
 assert.equal(couatl.legs.length,0);
 assert.deepEqual(couatl.wings.map(w=>w.userData.side),[-1,1]);
 const parts=meshes(couatl);
 assert.equal(parts.length,6,'one mesh per moving part plus the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['body','eyes','head','tail','wing']);
 for(const m of parts){
  const a=m.geometry.attributes;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 couatl.g.updateMatrixWorld(true);
 const b=box(couatl.g);
 assert(b.min.y>.08&&b.max.y<.95,`hovers at ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'fits the tile');
 // raised wings on either side, the head leads and the tail plumes trail
 const [left,right]=couatl.wings.map(box);
 assert(right.min.x>0&&right.max.x>.3&&left.max.x<0&&left.min.x<-.3,'wings spread');
 assert(right.max.y>box(couatl.body.children[0]).max.y,'wings raised above the back');
 assert(Math.abs(box(couatl.head).max.z-b.max.z)<1e-6,'head leads');
 assert(Math.abs(box(couatl.tail).min.z-b.min.z)<1e-6,'tail trails');
 // a green serpent: the body is more green than red or blue on average
 const col=parts.find(m=>m.userData.part==='body').geometry.attributes.color.array;
 const sum=[0,0,0];for(let i=0;i<col.length;i++)sum[i%3]+=col[i];
 assert(sum[1]>sum[0]&&sum[1]>sum[2],`body colour ${sum}`);
 // shared geometry and materials
 const other=meshes(createCreature({name:'couatl'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
 // the snakes are unchanged
 const snake=createCreature({name:'snake',symbol:S});
 assert.equal(snake.quirk,'snake');assert.equal(snake.wings.length,0);
});
