import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHobbit} from './hobbit.js';
import {createBugbear} from './bugbear.js';
import {createDwarf} from './dwarf.js';
import {ambushPose, ambushes, AMBUSH} from './humanoid-ambush.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const dwarves=[['bugbear',()=>createBugbear()]];
const make=([,build])=>{const a=build();a.g.updateMatrixWorld(true);return a;};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();
 a.g.traverse(m=>{if(!m.isSkinnedMesh)return;m.updateMatrixWorld(true);m.skeleton.update();const n=m.geometry.attributes.position.count;
  for(let i=0;i<n;i+=3){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}});return y;};

test('the bugbear ambushes; the hobbit, the dwarf and nothing else do',()=>{
 for(const f of dwarves)assert(ambushes(make(f)),f[0]);
 assert(!ambushes(createHobbit())&&!ambushes(createDwarf('dwarf')));
 assert(!ambushes(null)&&!ambushes({joints:{}}));
});

test('the ambush meets every goal under 2 cm on every dwarf',()=>{
 for(const f of dwarves){const r=ambushPose(make(f));
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${f[0]}: worst goal ${worst.toFixed(2)} cm`);}
});

test('ambushing: feet close and on the floor, pelvis low, chest leaning in, hands out ahead, nothing through the floor',()=>{
 for(const f of dwarves){const a=make(f),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),r=ambushPose(a);
  apply(r.pose);
  for(const s of ['l','r']){
   assert(P[`paw:${s}h`]().y-floor<.02,`${f[0]}: ${s} heel on the floor`);
   assert(Math.abs(P[`paw:${s}h`]().x-P.rump().x)<AMBUSH.stance*r.stand/2+.03,`${f[0]}: ${s} foot wide`);
   assert(P[`paw:${s}f`]().z-P[`shoulder:${s}`]().z>AMBUSH.reach*r.stand-.08,`${f[0]}: ${s} hand out ahead`);}
  assert(P.rump().y-floor<=AMBUSH.drop*r.stand+.02,`${f[0]}: pelvis low`);
  assert(P.withers().z-P.rump().z>AMBUSH.lean*r.stand-.05,`${f[0]}: leaning in`);
  assert(lowest(a)>floor-.02,`${f[0]}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const f of dwarves){const a=make(f),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  ambushPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${f[0]} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
