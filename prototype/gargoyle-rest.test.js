import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {restPose, rests, REST} from './gargoyle-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=[['gargoyle',11],['winged gargoyle',11],['gremlin',2]];
const make=([name,color])=>{const a=createCreature({name,symbol:'g'.charCodeAt(0),color});a.g.updateMatrixWorld(true);return a;};
const skins=a=>{const out=[];a.g.traverse(o=>{if(o.isSkinnedMesh)out.push(o);});return out;};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();
 for(const m of skins(a)){m.updateMatrixWorld(true);m.skeleton.update();const n=m.geometry.attributes.position.count;
  for(let i=0;i<n;i+=3){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}}return y;};

test('the gargoyles and gremlin rest this way; nothing else does',()=>{
 for(const f of FAMILY)assert(rests(make(f)),f[0]);
 assert(!rests(null)&&!rests({kind:'gremlin',joints:{}}));
});

test('the crouch meets every goal under 2 cm on all three',()=>{
 for(const f of FAMILY){const r=restPose(make(f));
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${f[0]}: worst goal ${worst.toFixed(2)} cm`);}
});

test('crouching: low on the haunches, feet on the floor, head up, tail down, nothing through the floor',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),r=restPose(a),stand=P.withers().y-floor;
  apply(r.pose);
  assert(P.withers().y-floor<=(f[0]==='gremlin'?REST.gremlinWithers:REST.withers)*r.high+.02,`${f[0]}: withers ${(P.withers().y-floor).toFixed(2)} of ${stand.toFixed(2)}`);
  for(const s of ['l','r'])assert(P[`paw:${s}h`]().y-floor<.02,`${f[0]}: hind foot on the floor`);
  if(f[0]!=='gremlin')for(const s of ['l','r'])assert(P[`paw:${s}f`]().y-floor<.02,`${f[0]}: knuckle on the floor`);
  assert(P.mouth().y-floor>REST.head*r.high-.02,`${f[0]}: head up`);
  assert(P.tailtip().y-floor<.05,`${f[0]}: tail on the floor`);
  assert(lowest(a)>floor-.02,`${f[0]}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);}
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const f of FAMILY){const a=make(f),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${f[0]} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});

test('the winged gargoyle folds its wings back along its flanks: tips behind the rump, no wider than the shoulders, not out to the sides',()=>{
 const a=make(['winged gargoyle',11]),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),open=Math.abs(P['wingtip:l']().x);
 apply(restPose(a).pose);a.g.updateMatrixWorld(true);
 for(const s of ['l','r']){const tip=P[`wingtip:${s}`](),sh=P[`shoulder:${s}`]();
  assert(tip.z<P.rump().z-.2,`${s} tip ${(tip.z-P.rump().z).toFixed(2)} from the rump`);
  assert(Math.abs(tip.x)<=Math.abs(sh.x)+.15*a.g.scale.x,`${s} tip x ${tip.x.toFixed(2)} against shoulder ${sh.x.toFixed(2)}`);
  assert(Math.abs(tip.x)<open*.6,`${s} tip is far narrower than the open wing`);
  assert(tip.y>floor+.05,`${s} tip off the floor`);}
});

test('the folded wings lie back along the flanks: no point of either wing above the wing root, the arm drooping at the pinned angle',()=>{
 const a=make(['winged gargoyle',11]),{apply}=birdPoser(a),r=restPose(a);
 apply(r.pose);a.g.updateMatrixWorld(true);
 const q=new THREE.Quaternion(),X=new THREE.Vector3();
 for(const s of ['l','r']){const w=a.joints[`${s}wing`],root=w.getWorldPosition(new THREE.Vector3()),top=new THREE.Box3().setFromObject(w,true).max.y;
  assert(top<=root.y+.12*a.g.scale.x,`${s} wing tops ${(top-root.y).toFixed(2)} above its root`);
  w.getWorldQuaternion(q);X.set(s==='l'?-1:1,0,0).applyQuaternion(q);
  assert(X.z<-.5,`${s} arm points back`);
  assert(Math.abs(Math.asin(-X.y)-REST.droop)<=.2,`${s} arm droops ${(Math.asin(-X.y)).toFixed(2)} rad against ${REST.droop}`);}
});
