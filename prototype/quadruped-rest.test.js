import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {restPose, rests, REST, SHORT} from './quadruped-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 4 of the creature plan for the heavy quadrupeds (family q), step 1: the lying rest.
const FAMILY=['rothe','mumak','mastodon','titanothere','baluchitherium','leocrotta','wumpus'];
const make=name=>{const a=createCreature({name,symbol:113,color:7});a.g.updateMatrixWorld(true);return a;};
const lowest=a=>{let y=Infinity;const b=new THREE.Box3();a.g.updateMatrixWorld(true);
 a.g.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){b.setFromObject(o,true);y=Math.min(y,b.min.y);}});
 a.g.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const v=new THREE.Vector3(),n=o.geometry.attributes.position.count;
  for(let i=0;i<n;i+=3){o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);y=Math.min(y,v.y);}}});return y;};

test('the seven heavy quadrupeds rest this way; nothing else does',()=>{
 for(const n of FAMILY)assert(rests(make(n)),n);
 assert(!rests(null)&&!rests({joints:{}})&&!rests(make('newt')));
});

test('lying down meets every goal under 2 cm on all seven',()=>{
 for(const n of FAMILY){const r=restPose(make(n));
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${n}: worst goal ${worst.toFixed(2)} cm`);}
});

test('lying: belly down, feet tucked under, head up, nothing through the floor',()=>{
 for(const n of FAMILY){const a=make(n),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),r=restPose(a);
  const stand=P['shoulder:l']().y-floor,short=r.high<.3*a.g.scale.x,share=short?SHORT:REST;
  apply(r.pose);
  assert(P['shoulder:l']().y-floor<stand*.9,`${n}: shoulder ${(P['shoulder:l']().y-floor).toFixed(2)} of ${stand.toFixed(2)}`);
  for(const s of ['l','r'])for(const p of ['f','h']){
   assert(P[`paw:${s}${p}`]().y-floor<.03,`${n}: ${s}${p} foot on the floor`);
   const from=P[p==='f'?`shoulder:${s}`:`hip:${s}`]();
   assert(P[`paw:${s}${p}`]().distanceTo(from)<=(share.tuck+.03)*r.high+.02,`${n}: ${s}${p} tucked under`);}
  assert(P.mouth().y-floor>REST.head*r.high-.02,`${n}: head up`);
  assert(lowest(a)>floor-.02,`${n}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const n of FAMILY){const a=make(n),built={};
  for(const [k,o] of Object.entries(a.joints))built[k]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [k,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[k],`${n} ${k}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
