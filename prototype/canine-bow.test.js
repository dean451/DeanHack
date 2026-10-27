import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {bowPose, bows, BOW} from './canine-bow.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=['jackal','werejackal','coyote','fox','little dog','dog','large dog','wolf','warg','winter wolf cub','winter wolf','hell hound pup','hell hound','dingo','werewolf'];
const make=name=>{const a=createCreature({name,symbol:100,color:11});a.g.updateMatrixWorld(true);return a;};
const solved=new Map();
// (the roles are read before posing: a paw is the sole of the standing leg, carried on its bone)
const bower=name=>{if(!solved.has(name)){const a=make(name),P=rolesOf(a),r=bowPose(a);birdPoser(a).apply(r.pose);solved.set(name,{a,P,r});}return solved.get(name);};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();
 a.g.traverse(m=>{if(!m.isSkinnedMesh)return;m.updateMatrixWorld(true);m.skeleton.update();
  for(let i=0;i<m.geometry.attributes.position.count;i+=3){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}});return y;};

test('every canine but Cerberus bows, and Cerberus and rigless actors do not',()=>{
 for(const name of FAMILY)assert(bows(make(name)),name);
 assert(!bows(make('cerberus'))&&!bows(null));
});

test('the bow meets every goal under 2 cm on every canine',()=>{
 for(const name of FAMILY){const {r}=bower(name);
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${name}: worst goal ${worst.toFixed(2)} cm`);}
});

test('bowing: chest low, rump up, all four paws on the floor, forepaws ahead, muzzle low and forward, tail up',()=>{
 for(const name of FAMILY){const {a,P,r}=bower(name),floor=a.g.position.y,up=k=>(P[k]().y-floor)/r.high;
  assert(up('shoulder:l')<BOW.chest+.1,`${name}: chest ${up('shoulder:l').toFixed(2)}`);
  assert(P['hip:l']().y>P['shoulder:l']().y+.4*r.high,`${name}: rump over the chest`);
  for(const p of ['lf','rf','lh','rh'])assert(Math.abs(P[`paw:${p}`]().y-floor)<.03,`${name}: paw ${p} on the floor`);
  assert(P['paw:lf']().z>P['shoulder:l']().z+.4*r.high,`${name}: forepaw ahead of the shoulder`);
  assert(up('mouth')<BOW.chin+.1,`${name}: muzzle low`);
  assert(P.mouth().z>P['shoulder:l']().z+.3*r.high,`${name}: muzzle forward`);
  assert(up('tailtip')>BOW.tail*(P['hip:l']().y-floor)/r.high-.1,`${name}: tail up`);}
});

test('nothing goes through the floor',()=>{
 for(const name of FAMILY){const {a}=bower(name);assert(lowest(a)>a.g.position.y-.02,`${name}: lowest point ${((lowest(a)-a.g.position.y)*100).toFixed(1)} cm`);}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const name of ['jackal','dog','wolf']){const a=make(name),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  bowPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${name} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
