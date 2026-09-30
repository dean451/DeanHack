import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {GOBLINS} from './goblin.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('goblins and hobgoblins get their own models instead of the orc humanoid',()=>{
 const tops={};
 for(const name of GOBLINS){
  const a=createCreature({name,symbol:111,color:7});
  assert.equal(a.g.name,name);assert.equal(a.quirk,'orc');
  for(const key of ['body','head','arm','weaponSocket','eyes'])assert(a[key]?.isObject3D,`${name} ${key}`);
  assert.equal(a.legs.length,2);assert.equal(a.arms.length,2);assert.equal(a.arm,a.arms[1]);
  assert.equal(a.weaponSocket.parent,a.arm,'the weapon is in the right fist');
  const parts=meshes(a);
  assert.equal(parts.length,8,`${name}: one mesh per moving part, plus the eyes`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(at.color)for(const v of at.color.array)assert(v>=0&&v<=1,`${name} ${m.userData.part} colour`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  assert.equal(new Set(parts.filter(m=>m.userData.part!=='eyes').map(m=>m.material)).size,1,'one shared material');
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>-.04&&b.min.y<.03,`${name}: feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,`${name}: out of the tile`);
  // the feet mirror each other
  const [l,r]=a.legs.map(leg=>new THREE.Box3().setFromObject(leg));
  assert(Math.abs((l.min.x+l.max.x)/2+(r.min.x+r.max.x)/2)<1e-6,`${name}: feet mirrored`);
  tops[name]=b.max.y;
  const again=meshes(createCreature({name}));
  parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry,'geometry shared'));
 }
 assert(tops.goblin>.75&&tops.goblin<1,`goblin top ${tops.goblin}`);
 assert(tops.hobgoblin>1.05&&tops.hobgoblin<1.3,`hobgoblin top ${tops.hobgoblin}`);
 assert(tops.hobgoblin>tops.goblin+.2,'the hobgoblin stands well over the goblin');
 // real orcs keep the orc humanoid
 assert.notEqual(createCreature({name:'hill orc'}).g.name,'goblin');
});
