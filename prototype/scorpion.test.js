import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {skitters} from './skitter.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('scorpions get pincers, a curled stinger tail and eight skittering legs instead of a red spider',()=>{
 const sizes={};
 for(const name of ['scorpion','Scorpius']){
  const s=createCreature({name,symbol:115,color:1});
  assert.equal(s.quirk,'spider',name);assert(skitters(s),name);
  assert.equal(s.legs.length,8,name);assert.equal(s.claws.length,2,name);
  assert(s.body?.isObject3D&&s.head?.isMesh&&s.tail?.isObject3D,name);
  const parts=meshes(s);
  assert.equal(parts.length,13,`${name}: body, eyes, tail, two pincers and eight legs`);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of a.color?.array||[])assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<30000,`${name}: ${verts} vertices`);
  s.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(s.g);
  assert(Math.abs(b.min.y)<.02,`${name} feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.95,`${name} too wide`);
  // the stinger hangs above the back, and the pincers reach out in front
  const tail=new THREE.Box3().setFromObject(s.tail),claw=new THREE.Box3().setFromObject(s.claws[0]),carapace=new THREE.Box3().setFromObject(s.head);
  assert(tail.max.y>carapace.max.y*2,`${name} tail arches over the back`);
  assert(claw.max.z>carapace.max.z,`${name} pincers reach forward`);
  // the left side mirrors the right
  const cx=o=>{const bb=new THREE.Box3().setFromObject(o);return (bb.min.x+bb.max.x)/2;};
  assert(Math.abs(cx(s.claws[0])+cx(s.claws[1]))<1e-6,`${name} pincers mirrored`);
  for(let i=0;i<4;i++)assert(Math.abs(cx(s.legs[i])+cx(s.legs[i+4]))<1e-6,`${name} leg ${i} mirrored`);
  sizes[name]=b.max.y;
 }
 assert(sizes.Scorpius>sizes.scorpion*1.4,'Scorpius dwarfs a plain scorpion');
 // other spiders keep the spider build; scorpions share their geometry
 assert(!createCreature({name:'cave spider'}).claws);
 const [a,b]=[createCreature({name:'scorpion'}),createCreature({name:'scorpion'})].map(meshes);
 a.forEach((m,i)=>{assert.equal(m.geometry,b[i].geometry);assert.equal(m.material,b[i].material);});
});
