import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {createGnome} from './gnome.js';
import {restPose, rests, REST} from './kop-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 4 of the creature plan for the Kops (family K), step 1: standing at ease, solved by role on every Kop.
const FAMILY=['keystone kop','kop sergeant','kop lieutenant','kop kaptain'].map(n=>[n,()=>createCreature({name:n,symbol:75,color:4})]);
const make=([,build])=>{const a=build();a.g.updateMatrixWorld(true);return a;};
const solved=new Map(),ease=f=>{if(!solved.has(f[0]))solved.set(f[0],restPose(make(f)));return solved.get(f[0]);};
// every vertex of every mesh, skinned or not (hide, boots, helmet, truncheon), in world space
const vertices=a=>{const out=[],v=new THREE.Vector3();a.g.updateMatrixWorld(true);
 a.g.traverse(m=>{if(!m.isMesh)return;if(m.isSkinnedMesh)m.skeleton.update();const p=m.geometry.attributes.position;
  for(let i=0;i<p.count;i++)out.push((m.isSkinnedMesh?m.getVertexPosition(i,v):v.fromBufferAttribute(p,i)).applyMatrix4(m.matrixWorld).clone());});return out;};
// a posed actor and its role table (the table is built on the standing actor: it measures the sole and face as built)
const posed=f=>{const a=make(f),P=rolesOf(a),r=ease(f);birdPoser(a).apply(r.pose);return {a,P,r};};

test('every Kop stands at ease; a goblin or gnome does not',()=>{
 for(const f of FAMILY)assert(rests(make(f)),f[0]);
 assert(!rests(createGoblin('goblin'))&&!rests(createGnome('gnome'))&&!rests(null));
});

test('the stance meets every goal under 2 cm on every Kop',()=>{
 for(const f of FAMILY){const worst=Math.max(...ease(f).residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${f[0]}: worst goal ${worst.toFixed(2)} cm`);}
});

test('the feet part by the drill\'s move, flat on the floor, the weight between them',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),floor=a.g.position.y,gap=P['paw:rh']().x-P['paw:lh']().x,r=ease(f);
  birdPoser(a).apply(r.pose);
  assert(Math.abs(P['paw:rh']().x-P['paw:lh']().x-(gap+r.out))<.01,`${f[0]}: feet ${(P['paw:rh']().x-P['paw:lh']().x).toFixed(3)} apart, wanted ${(gap+r.out).toFixed(3)}`);
  assert(Math.abs(P['paw:lh']().x+P['paw:rh']().x)<.01,`${f[0]}: the weight is between the feet`);
  assert(r.out>.15*r.height&&r.out<.2*r.height,`${f[0]}: the move is the soldier's 25 to 30 cm share of a man's height`);
  for(const s of ['l','r']){assert(Math.abs(P[`paw:${s}h`]().y-floor)<.01,`${f[0]} ${s}: on the floor`);
   // the foot bone keeps its standing tilt within 6 degrees: the sole lies flat, not on its edge or toe
   const foot=a.joints[`${s}leg1_2`],q=foot.getWorldQuaternion(new THREE.Quaternion());birdPoser(a).apply({});
   const q0=foot.getWorldQuaternion(new THREE.Quaternion());birdPoser(a).apply(r.pose);
   const up=new THREE.Vector3(0,1,0),tilt=up.clone().applyQuaternion(q).angleTo(up.clone().applyQuaternion(q0));
   assert(tilt<.1,`${f[0]} ${s}: sole tilted ${(tilt*180/Math.PI).toFixed(1)} degrees`);}
 }
});

test('the hands are behind the back at the belt, centred, clear of the coat',()=>{
 for(const f of FAMILY){const {a,P,r}=posed(f),mid=a.g.position.x;
  for(const s of ['l','r']){const h=P[`paw:${s}f`]();
   assert(Math.abs(h.y-r.belt)<.04,`${f[0]} ${s}: hand at ${h.y.toFixed(3)}, belt ${r.belt.toFixed(3)}`);
   assert(h.z<r.back+REST.back*r.stand*.5,`${f[0]} ${s}: hand behind the back (z ${h.z.toFixed(3)}, back ${r.back.toFixed(3)})`);
   assert(Math.abs(h.x-mid)<REST.clasp*r.stand,`${f[0]} ${s}: hand centred`);}
  assert(P['paw:lf']().distanceTo(P['paw:rf']())<.1*r.stand+REST.clasp*r.stand,`${f[0]}: the hands together`);}
});

test('upright: withers over the pelvis, head at its standing height, the pelvis barely lowered',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),floor=a.g.position.y,mouth=P.mouth().y,rump=P.rump().y,r=ease(f);
  birdPoser(a).apply(r.pose);
  assert(Math.abs(P.withers().z-P.rump().z)<=REST.upright*r.stand+.01,`${f[0]}: upright`);
  assert(Math.abs(P.mouth().y-mouth)<.04*r.stand,`${f[0]}: head level`);
  assert(P.rump().y-floor>(rump-floor)*.94,`${f[0]}: pelvis ${(P.rump().y-floor).toFixed(3)} of ${(rump-floor).toFixed(3)}`);}
});

test('nothing goes through the floor: every vertex of every mesh',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,standing=Math.min(...vertices(a).map(v=>v.y));
  birdPoser(a).apply(ease(f).pose);
  const low=Math.min(...vertices(a).map(v=>v.y));
  assert(low>Math.min(standing,floor)-.005,`${f[0]}: lowest ${((low-floor)*100).toFixed(1)} cm`);}
});

test('posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const f of FAMILY){const a=make(f),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  restPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${f[0]} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
