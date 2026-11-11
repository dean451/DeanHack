import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {restPose, rests, REST} from './rat-rest.js';
import {lowestOf} from './quadruped-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 4 of the creature plan for the rats (family r), step 1: the hunched rest.
const FAMILY=['enormous rat','giant rat','rabid rat','sewer rat'];
const make=name=>{const a=createCreature({name,symbol:114,color:7});a.g.updateMatrixWorld(true);return a;};
const lowest=a=>{let y=Infinity;const b=new THREE.Box3();a.g.updateMatrixWorld(true);
 a.g.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){b.setFromObject(o,true);y=Math.min(y,b.min.y);}});
 a.g.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const v=new THREE.Vector3(),n=o.geometry.attributes.position.count;
  for(let i=0;i<n;i+=3){o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);y=Math.min(y,v.y);}}});return y;};
const poses=new Map();
const solved=name=>{if(!poses.has(name))poses.set(name,restPose(make(name)));return poses.get(name);};

test('the four rats rest this way; nothing else does',()=>{
 for(const n of FAMILY)assert(rests(make(n)),n);
 for(const n of ['rothe','mumak','newt','jackal'])assert(!rests(createCreature({name:n,symbol:113,color:7})),n);
 assert(!rests(null)&&!rests({joints:{}}));
});

test('the hunch meets every goal under 2 cm on all four',()=>{
 for(const n of FAMILY){const r=solved(n),worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${n}: worst goal ${worst.toFixed(2)} cm`);}
});

test('hunched: body down, feet on the floor and tucked, nose low, tail on the floor, nothing through it',()=>{
 for(const n of FAMILY){const a=make(n),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),r=solved(n);
  const stand=P['shoulder:l']().y-floor,mouth=P.mouth().y-floor;
  apply(r.pose);
  assert(P['shoulder:l']().y-floor<stand*.8,`${n}: shoulder down from ${stand.toFixed(3)}`);
  for(const s of ['l','r'])for(const p of ['f','h']){
   assert(Math.abs(P[`paw:${s}${p}`]().y-floor)<.02,`${n}: ${s}${p} foot on the floor`);
   const from=P[p==='f'?`shoulder:${s}`:`hip:${s}`]();
   assert(P[`paw:${s}${p}`]().distanceTo(from)<=REST.tuck*r.high+.02,`${n}: ${s}${p} tucked under`);}
  assert(P.mouth().y-floor<=REST.mouth*r.high+.02&&P.mouth().y-floor<mouth,`${n}: nose sunk low`);
  assert(Math.abs(lowestOf(a.joints.tail0)()[0].y-floor)<.02,`${n}: tail rests on the floor`);
  assert(lowest(a)>floor-.02,`${n}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);
  apply({});}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const n of FAMILY){const a=make(n),built={};
  for(const [k,o] of Object.entries(a.joints))built[k]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [k,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[k],`${n} ${k}`);
  assert.deepEqual(a.body.position.toArray(),body);
  const {apply}=birdPoser(a);apply(solved(n).pose);apply({});
  for(const [k,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[k],`${n} ${k} after a pose`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
