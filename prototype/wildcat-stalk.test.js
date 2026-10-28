import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFeline} from './feline.js';
import {stalkPose, stalks, STALK} from './wildcat-stalk.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=['jaguar','lynx','panther','tiger','displacer beast'];
const make=name=>{const a=createFeline(name);a.g.updateMatrixWorld(true);return a;};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();
 a.g.traverse(m=>{if(!m.isSkinnedMesh)return;m.updateMatrixWorld(true);m.skeleton.update();
  for(let i=0;i<m.geometry.attributes.position.count;i+=3){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}});return y;};

test('only the wild cats with joints stalk this way',()=>{
 for(const name of FAMILY)assert(stalks(make(name)),name);
 assert(!stalks(null));
});

test('the stalking crouch meets every goal under 2 cm on every wild cat',()=>{
 for(const name of FAMILY){const r=stalkPose(make(name));
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${name}: worst goal ${worst.toFixed(2)} cm`);}
});

test('crouched: shoulders and hips low, head low and thrust ahead, paws planted, tail low, nothing through the floor',()=>{
 for(const name of FAMILY){const a=make(name),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),r=stalkPose(a);
  const hipHigh=P['hip:l']().y-floor,tailLen=P.tailtip().distanceTo(P.rump());
  apply(r.pose);a.g.updateMatrixWorld(true);
  assert((P['shoulder:l']().y-floor)/r.high<=STALK.shoulder[1]+.03,`${name}: shoulder low`);
  assert((P['hip:l']().y-floor)/hipHigh<=STALK.hip[1]+.03,`${name}: hip low`);
  assert(P.mouth().z-P['shoulder:l']().z>.2*r.high,`${name}: head thrust ahead`);
  for(const s of ['l','r'])assert(P[`paw:${s}f`]().y-floor<.03&&P[`paw:${s}h`]().y-floor<.03,`${name}: paws on the floor`);
  assert(P.tailtip().y<=Math.max(floor+STALK.tail*r.high,P.rump().y-STALK.drop*tailLen)+.02,`${name}: tail low`);
  assert(lowest(a)>floor-.02,`${name}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);}
});

test('posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const name of FAMILY){const a=make(name),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  stalkPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${name} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
