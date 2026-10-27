import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {restPose, rests, REST} from './canine-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=['jackal','werejackal','coyote','fox','little dog','dog','large dog','wolf','warg','winter wolf cub','winter wolf','hell hound pup','hell hound','dingo','werewolf'];
const make=name=>{const a=createCreature({name,symbol:100,color:11});a.g.updateMatrixWorld(true);return a;};
const solved=new Map();
const sleeper=name=>{if(!solved.has(name)){const a=make(name),r=restPose(a);birdPoser(a).apply(r.pose);solved.set(name,{a,r});}return solved.get(name);};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();
 a.g.traverse(m=>{if(!m.isSkinnedMesh)return;m.updateMatrixWorld(true);m.skeleton.update();
  for(let i=0;i<m.geometry.attributes.position.count;i+=3){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}});return y;};

test('every canine but Cerberus curls up, and Cerberus and rigless actors do not',()=>{
 for(const name of FAMILY)assert(rests(make(name)),name);
 assert(!rests(make('cerberus'))&&!rests(null)&&!rests({quirk:'dog',joints:{}}));
});

test('the curl meets every goal under 2 cm on every canine',()=>{
 for(const name of FAMILY){const {r}=sleeper(name);
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${name}: worst goal ${worst.toFixed(2)} cm`);}
});

test('lying: belly down, paws on the floor, muzzle low by the haunch, tail laid down, nothing through the floor',()=>{
 for(const name of FAMILY){const {a,r}=sleeper(name),floor=a.g.position.y,P=rolesOf(a);
  assert(P['hip:l']().y-floor<.6*r.high,`${name}: haunch ${(P['hip:l']().y-floor).toFixed(2)} of ${r.high.toFixed(2)}`);
  for(const p of ['lf','rf','lh','rh'])assert(P[`paw:${p}`]().y-floor<.03,`${name}: paw ${p} on the floor`);
  assert(P.mouth().y-floor<(REST.chin+.1)*r.high,`${name}: muzzle low`);
  assert(P.mouth().distanceTo(P['hip:l']())<=REST.nose*r.high+.02,`${name}: muzzle by the haunch`);
  assert(P.tailtip().y<=P.rump().y+.1*r.high,`${name}: tail laid down`);
  assert(lowest(a)>floor-.02,`${name}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);}
});

test('the tail is laid round the body, its tip within one head length of the muzzle',()=>{
 for(const name of FAMILY){const a=make(name),P=rolesOf(a),head=P.head().distanceTo(P.mouth());
  const r=restPose(a);birdPoser(a).apply(r.pose);
  const d=P.tailtip().distanceTo(P.mouth());
  assert(d<=head,`${name}: tail tip ${d.toFixed(2)} from the muzzle, head length ${head.toFixed(2)}`);}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const name of ['jackal','dog','wolf']){const a=make(name),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${name} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
