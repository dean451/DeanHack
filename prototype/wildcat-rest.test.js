import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFeline} from './feline.js';
import {restPose, rests, REST} from './wildcat-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=['jaguar','lynx','panther','tiger','displacer beast'];
const make=name=>{const a=createFeline(name);a.g.updateMatrixWorld(true);return a;};
const cm=v=>(Array.isArray(v)?Math.hypot(...v):Math.abs(v))*100;
const skins=a=>{const out=[];a.g.traverse(o=>{if(o.isSkinnedMesh)out.push(o);});return out;};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();
 for(const m of skins(a)){m.updateMatrixWorld(true);m.skeleton.update();const n=m.geometry.attributes.position.count;
  for(let i=0;i<n;i+=3){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}}return y;};

test('only the wild cats with joints rest this way',()=>{
 for(const name of FAMILY)assert(rests(make(name)),name);
 assert(!rests(null)&&!rests({quirk:'feline',joints:{}}));
});

test('the sphinx rest meets every goal under 2 cm on every wild cat',()=>{
 for(const name of FAMILY){const r=restPose(make(name));
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${name}: worst goal ${worst.toFixed(2)} cm`);}
});

test('lying: belly down, forepaws reached ahead, hind feet in by the haunch, head up, nothing through the floor',()=>{
 for(const name of FAMILY){const a=make(name),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),r=restPose(a);
  apply(r.pose);a.g.updateMatrixWorld(true);
  assert(P.withers().y-floor<.7*r.high,`${name}: withers ${(P.withers().y-floor).toFixed(2)} of ${r.high.toFixed(2)}`);
  for(const s of ['l','r']){
   assert(P[`paw:${s}f`]().z-P[`shoulder:${s}`]().z>.2*r.high,`${name}: forepaw ahead of the shoulder`);
   assert(P[`paw:${s}f`]().y-floor<.03&&P[`paw:${s}h`]().y-floor<.03,`${name}: paws on the floor`);}
  assert(P.mouth().y-floor>REST.head*r.high-.02,`${name}: head up`);
  assert(P.tailtip().y<P.rump().y,`${name}: tail laid down`);
  assert(lowest(a)>floor-.02,`${name}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const name of FAMILY){const a=make(name),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${name} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
