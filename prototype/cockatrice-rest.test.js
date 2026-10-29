import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {restPose, birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=['chickatrice','cockatrice','pyrolisk'];
const make=name=>{const a=createCreature({name,symbol:99,color:11});a.g.updateMatrixWorld(true);return a;};
const cm=v=>Math.hypot(...v)*100;

test('the resting pose meets every goal under 2 cm on every member',()=>{
 for(const name of FAMILY){const a=make(name),r=restPose(a);
  const worst=Math.max(...r.residuals.map(cm));
  assert(worst<2,`${name}: worst goal ${worst.toFixed(2)} cm`);}
});

test('lying down: the breast on the floor, the feet folded up off it, the beak and tail near it, nothing through the floor',()=>{
 for(const name of FAMILY){const a=make(name),floor=a.g.position.y,{apply}=birdPoser(a),r=restPose(a);
  apply(r.pose);const P=rolesOf(a);
  assert(Math.abs(r.breast().y-floor)<.01,`${name}: breast at ${r.breast().y-floor}`);
  for(const role of ['paw:lf','paw:rf','paw:lh','paw:rh'])assert(P[role]().y>floor+.005,`${name}: ${role} folded up`);
  assert(P.mouth().y-floor<.09*a.g.scale.x,`${name}: beak low`);
  const box=new THREE.Box3().setFromObject(a.g);
  assert(box.min.y>floor-.012,`${name}: lowest point ${(box.min.y-floor)*100} cm`);
  const tail=P.tailtip().y-floor;assert(tail<.1&&tail>0,`${name}: tail tip ${tail}`);
  assert(P['wingtip:l']().x>P['wingtip:r']().x-1&&P['wingtip:l']().x<0&&P['wingtip:r']().x>0,`${name}: wings stay on their sides`);}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const name of FAMILY){const a=make(name),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${name} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});

test('the head is tucked back: within a body length of the shoulder and behind the breast\'s front',()=>{
 for(const name of FAMILY){const a=make(name),{apply}=birdPoser(a),r=restPose(a);
  // (the breast's front: the frontmost of the body's own parts, in the body's space)
  const inv=a.body.matrixWorld.clone().invert(),front=Math.max(...a.body.children.filter(o=>o.isMesh).map(o=>new THREE.Box3().setFromObject(o).applyMatrix4(inv).max.z));
  apply(r.pose);const P=rolesOf(a),local=v=>a.body.worldToLocal(v.clone());
  const shoulder=P['shoulder:l']().add(P['shoulder:r']()).multiplyScalar(.5),length=shoulder.distanceTo(P.rump());
  assert(P.head().distanceTo(shoulder)<length,`${name}: head ${P.head().distanceTo(shoulder).toFixed(3)} from the shoulder, body ${length.toFixed(3)}`);
  assert(local(P.head()).z<front,`${name}: head at z ${local(P.head()).z.toFixed(3)}, breast front ${front.toFixed(3)}`);}
});
