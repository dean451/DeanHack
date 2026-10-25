import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {restPose, rests} from './bee-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=['killer bee','queen bee'];
const make=name=>{const a=createCreature({name,symbol:97,color:3});a.g.updateMatrixWorld(true);return a;};
const cm=v=>Math.hypot(...v)*100;
// the lowest vertex, skinned legs as they are posed (a skinned mesh's bounding box is the bind pose's)
const lowest=a=>{a.g.updateMatrixWorld(true);const v=new THREE.Vector3();let low=Infinity;
 a.g.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);low=Math.min(low,v.y);}}
  else if(o.isMesh){const b=new THREE.Box3().setFromObject(o);low=Math.min(low,b.min.y);}});return low;};
const PAWS=['paw:lf','paw:rf','paw:lm','paw:rm','paw:lh','paw:rh'];

test('only bees rest this way',()=>{
 assert(FAMILY.every(n=>rests(make(n))));
 assert(!rests(make('giant ant')));
});

test('the resting pose meets every goal under 2 cm on both bees',()=>{
 for(const name of FAMILY){const r=restPose(make(name)),worst=Math.max(...r.residuals.map(cm));
  assert(worst<2,`${name}: worst goal ${worst.toFixed(2)} cm`);}
});

test('landed: all six feet on the floor, the head hung low, the wings folded back along the abdomen, nothing through the floor',()=>{
 for(const name of FAMILY){const a=make(name),floor=a.g.position.y,s=a.g.scale.x,{apply}=birdPoser(a),hover=rolesOf(a)['paw:lf']().y-floor,r=restPose(a);
  assert(hover>.1*s,`${name}: built hovering`);
  apply(r.pose);const P=rolesOf(a);
  for(const p of PAWS)assert(Math.abs(P[p]().y-floor)<.02,`${name}: ${p} at ${((P[p]().y-floor)*100).toFixed(1)} cm`);
  assert(P.head().y-P.mouth().y>.09*s,`${name}: head hangs`);
  for(const side of ['l','r']){const t=P[`wingtip:${side}`]();
   assert(side==='l'?t.x<0:t.x>0,`${name}: ${side} wing stays on its side`);
   assert(Math.abs(t.x)<.06*s,`${name}: ${side} wing folded in`);
   assert(t.z<P.rump().z-.09*s,`${name}: ${side} wing trails past the waist`);}
  const low=lowest(a);
  assert(low>floor-.005,`${name}: lowest point ${((low-floor)*100).toFixed(1)} cm`);}
});

test('the pose is easy to leave: solving leaves every joint and the body exactly at the built values',()=>{
 for(const name of FAMILY){const a=make(name),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${name} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
