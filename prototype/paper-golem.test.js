import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const QUOTE=39;// "'"
function meshes(actor){const list=[];actor.g.traverse(o=>{if(o.isMesh)list.push(o);});return list;}

test('the paper golem is folded from printed paper instead of the tinted stone golem',()=>{
 const t0=performance.now(),golem=createCreature({name:'paper golem',symbol:QUOTE,color:11}),ms=performance.now()-t0;
 assert.equal(golem.quirk,'golem');
 for(const key of ['body','head','arm','core'])assert(golem[key]?.isObject3D,key);
 assert.equal(golem.legs.length,2);assert.equal(golem.arms.length,2);assert(golem.arms.includes(golem.arm));
 assert.equal(golem.g.userData.core,golem.core);
 assert(golem.core.material.emissive.getHex()>0,'the eyes glow');
 const parts=meshes(golem);
 assert.equal(parts.length,7,'one mesh per moving part plus the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['arm','body','eyes','head','leg']);
 assert.equal(new Set(parts.map(m=>m.material)).size,2,'paper and eye materials');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
  for(let i=0;i<a.normal.count;i++){const l=Math.hypot(a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i));assert(Math.abs(l-1)<1e-3,`${m.userData.part} normal ${l}`);}
 }
 assert(verts<8000,`${verts} vertices`);
 golem.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(golem.g);
 assert(b.min.y>-.02&&b.min.y<.02,`feet at ${b.min.y}`);
 assert(b.max.y>1.05&&b.max.y<1.4,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'fits the tile');
 // the arms hang on either side, near mirror images (the fans and fingers differ a little)
 const la=new THREE.Box3().setFromObject(golem.arms[0]),ra=new THREE.Box3().setFromObject(golem.arms[1]);
 assert(Math.abs(ra.max.x+la.min.x)<.03&&Math.abs(ra.min.y-la.min.y)<.03,`arms ${la.min.x} ${ra.max.x} ${la.min.y} ${ra.min.y}`);
 assert(ra.min.x>.2&&la.max.x<-.2,'arms hang outside the torso');
 // shared geometry and materials
 const other=meshes(createCreature({name:'paper golem'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
 console.log(`paper golem: ${verts} vertices, ${ms.toFixed(0)} ms, bounds`,b.min.toArray().map(v=>+v.toFixed(3)),b.max.toArray().map(v=>+v.toFixed(3)));
 // the other golems keep the slab body
 assert(meshes(createCreature({name:'rope golem',symbol:QUOTE})).length>7);
});
