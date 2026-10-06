import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('jabberwocks are bladed predators with a hinged jaw, scythe arms and glowing edges',()=>{
 for(const name of ['vorpal jabberwock','jabberwock']){
  const t0=performance.now(),j=createCreature({name,symbol:74,color:5}),ms=performance.now()-t0;
  assert.equal(j.quirk,'dragon',name);
  for(const key of ['body','head','jaw','arm','tail'])assert(j[key]?.isObject3D,`${name} ${key}`);
  assert.equal(j.legs.length,2);assert.equal(j.arms.length,2);assert.equal(j.wings.length,2);
  assert.equal(j.jaw.parent,j.head,'the jaw hinges off the head');
  const parts=meshes(j);
  assert(parts.length<=32,`${name}: ${parts.length} draws`);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
  }
  assert(verts<100000,`${name}: ${verts} vertices`);
  // blades glow along their edges, and every moving part carries some
  const glow=parts.filter(m=>m.material.emissiveIntensity>1);
  for(const p of ['body','head','arm','leg','tail'])assert(glow.some(m=>m.userData.part===p||m.userData.part==='eyes'&&p==='head'),`${name}: no glow on ${p}`);
  j.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(j.g);
  assert(b.min.y>-.04&&b.min.y<.03,`${name}: feet at ${b.min.y}`);
  const head=new THREE.Box3().setFromObject(j.head);
  assert(head.max.y>1.4,`${name}: head tops out at ${head.max.y}`);
  assert(Math.max(-b.min.x,b.max.x)<1.35&&-b.min.z<1.65,`${name}: too sprawling`);
  const arm=new THREE.Box3().setFromObject(j.arm);
  assert(arm.max.z>.55,`${name}: talons reach z ${arm.max.z}`);
  assert(ms<1500,`${name} took ${ms} ms`);
  // geometry and materials are shared between jabberwocks of a kind
  const other=meshes(createCreature({name}));
  parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 }
 // the vorpal one is the bigger, and an unlisted J gets the plain one
 assert(createCreature({name:'vorpal jabberwock'}).g.scale.x>createCreature({name:'jabberwock'}).g.scale.x);
 assert.equal(createCreature({name:'something',symbol:74,color:1}).g.name,'jabberwock');
});
