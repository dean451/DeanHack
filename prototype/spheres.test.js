import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const E=101;// 'e'
function parts(actor){const meshes=[];actor.g.traverse(o=>{if(o.isMesh)meshes.push(o);});return meshes;}

test('gas spores and flaming and freezing spheres get their own hovering models, not the floating eye',()=>{
 const eye=parts(createCreature({name:'floating eye',symbol:E,color:4}));
 const expected={'gas spore':['spore'],'flaming sphere':['core','flames'],'freezing sphere':['core','ice']};
 for(const [name,want] of Object.entries(expected)){
  const t0=performance.now(),actor=createCreature({name,symbol:E,color:7}),ms=performance.now()-t0;
  assert.equal(actor.quirk,'hover',name);assert(actor.body,name);
  const meshes=parts(actor);
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),want,name);
  assert.notEqual(meshes.length,eye.length,`${name} still looks like a floating eye`);
  for(const m of meshes){
   for(const key of ['position','normal','color'])if(m.geometry.attributes[key])for(const v of m.geometry.attributes[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   const col=m.geometry.attributes.color;if(col)for(const v of col.array)assert(v>=0&&v<=1,name);
  }
  actor.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(actor.g);
  assert(b.min.y>.05&&b.max.y<1.05,`${name} height ${b.min.y}..${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,`${name} too wide`);
  assert(b.max.x-b.min.x>.3,`${name} too small`);
  if(name==='gas spore')assert(!actor.core&&!actor.g.userData.core,'a gas spore does not glow');
  else{assert(actor.core&&actor.g.userData.core===actor.core,name);assert(actor.core.material.emissiveIntensity>0);}
  assert(ms<1000,`${name} took ${ms} ms`);
 }
 const fire=createCreature({name:'flaming sphere'}),frost=createCreature({name:'freezing sphere'});
 assert.notEqual(fire.core.material.emissive.getHexString(),frost.core.material.emissive.getHexString());
 // the static parts are shared between instances, so a room of spores costs no extra geometry
 assert.equal(parts(createCreature({name:'gas spore'}))[0].geometry,parts(createCreature({name:'gas spore'}))[0].geometry);
 // shocking spheres and unlisted e's are unchanged
 assert(createCreature({name:'shocking sphere'}).core);
 assert.equal(parts(createCreature({name:'strange eye',symbol:E,color:4})).length,eye.length);
});
