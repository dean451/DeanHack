import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {ORCS} from './orc.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('every orc kind gets its own model instead of the box humanoid',()=>{
 const tops={};
 for(const name of ORCS){
  const a=createCreature({name,symbol:111,color:1});
  assert.equal(a.g.name,name);assert.equal(a.quirk,'orc');
  for(const key of ['body','head','arm','weaponSocket','eyes'])assert(a[key]?.isObject3D,`${name} ${key}`);
  assert.equal(a.legs.length,2);assert.equal(a.arms.length,2);assert.equal(a.arm,a.arms[1]);
  assert.equal(a.weaponSocket.parent,a.arm,'the weapon is in the right fist');
  assert.equal(a.hat,null);assert.equal(a.beard,null);assert.equal(a.pick,null);
  const parts=meshes(a);
  assert.equal(parts.length,8,`${name}: one mesh per moving part, plus the eyes`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of at.color.array)assert(v>=0&&v<=1,`${name} ${m.userData.part} colour`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  assert.equal(new Set(parts.filter(m=>m.userData.part!=='eyes').map(m=>m.material)).size,1,'one shared material');
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>-.04&&b.min.y<.03,`${name}: feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,`${name}: out of the tile (${b.min.x} ${b.max.x} ${b.min.z} ${b.max.z})`);
  const [l,r]=a.legs.map(leg=>new THREE.Box3().setFromObject(leg));
  assert(Math.abs((l.min.x+l.max.x)/2+(r.min.x+r.max.x)/2)<1e-6,`${name}: feet mirrored`);
  // the eyes look out from the front of the face
  const eye=a.eyes.getWorldPosition(new THREE.Vector3()),head=a.head.getWorldPosition(new THREE.Vector3());
  assert(eye.distanceTo(head)<.2,`${name}: eyes on the head`);
  tops[name]=b.max.y;
  const again=meshes(createCreature({name}));
  parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry,'geometry shared'));
 }
 for(const [name,top] of Object.entries(tops))assert(top>1.1&&top<1.7,`${name} top ${top}`);
 assert(tops['uruk-hai']>tops['mordor orc']+.1,'the Uruk-hai stand a head taller');
 // an unlisted orc, or any o, still gets an orc; goblins, orc zombies, orc mummies and Orcus keep their own
 assert.equal(createCreature({name:'snaga'}).g.name,'orc');
 assert.equal(createCreature({name:'orc ancestor',symbol:111}).quirk,'orc');
 assert.equal(createCreature({name:'hobgoblin'}).g.name,'hobgoblin');
 for(const name of ['orc zombie','orc mummy','Orcus'])assert(!ORCS.includes(createCreature({name}).g.name),name);
});
