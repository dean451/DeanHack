import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

// how many of a skin's vertices ride a bone whose name holds `stem`, and how far forward (world z) they reach
const onBone=(m,i,stem)=>{const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;for(let k=0;k<4;k++)if(sw.getComponent(i,k)>0&&m.skeleton.bones[si.getComponent(i,k)].name.includes(stem))return true;return false;};
const rides=(m,stem)=>{let n=0;for(let i=0;i<m.geometry.attributes.position.count;i++)if(onBone(m,i,stem))n++;return n;};
const farthest=(m,stem)=>{m.updateMatrixWorld(true);const v=new THREE.Vector3();let z=-Infinity;for(let i=0;i<m.geometry.attributes.position.count;i++)if(onBone(m,i,stem)){m.getVertexPosition(i,v);z=Math.max(z,v.applyMatrix4(m.matrixWorld).z);}return z;};

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
  assert(glow.some(m=>m.userData.part==='eyes'),`${name}: no glow on head`);
  // (the trunk, arms, legs and tail are skinned into one mesh per material: their glow rides their bones)
  for(const p of ['spine','neck','fore_','leg1_','tail'])assert(glow.some(m=>m.isSkinnedMesh&&rides(m,p)>0),`${name}: no glow on ${p}`);
  j.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(j.g);
  assert(b.min.y>-.04&&b.min.y<.03,`${name}: feet at ${b.min.y}`);
  const head=new THREE.Box3().setFromObject(j.head);
  assert(head.max.y>1.4,`${name}: head tops out at ${head.max.y}`);
  assert(Math.max(-b.min.x,b.max.x)<1.35&&-b.min.z<1.65,`${name}: too sprawling`);
  const reach=Math.max(...parts.filter(m=>m.isSkinnedMesh).map(m=>farthest(m,'rfore_')));
  assert(reach>.55,`${name}: talons reach z ${reach}`);
  assert(ms<1500,`${name} took ${ms} ms`);
  // geometry and materials are shared between jabberwocks of a kind
  const other=meshes(createCreature({name}));
  parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 }
 // the vorpal one is the bigger, and an unlisted J gets the plain one
 assert(createCreature({name:'vorpal jabberwock'}).g.scale.x>createCreature({name:'jabberwock'}).g.scale.x);
 assert.equal(createCreature({name:'something',symbol:74,color:1}).g.name,'jabberwock');
});
