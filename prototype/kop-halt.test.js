import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {createGnome} from './gnome.js';
import {haltPose, halts, HALT} from './kop-halt.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 4 of the creature plan for the Kops (family K), step 2: the signature, the halt (arm out, club cocked).
const FAMILY=['keystone kop','kop sergeant','kop lieutenant','kop kaptain'].map(n=>[n,()=>createCreature({name:n,symbol:75,color:4})]);
const make=([,build])=>{const a=build();a.g.updateMatrixWorld(true);return a;};
const solved=new Map(),halt=f=>{if(!solved.has(f[0]))solved.set(f[0],haltPose(make(f)));return solved.get(f[0]);};
const vertices=a=>{const out=[],v=new THREE.Vector3();a.g.updateMatrixWorld(true);
 a.g.traverse(m=>{if(!m.isMesh)return;if(m.isSkinnedMesh)m.skeleton.update();const p=m.geometry.attributes.position;
  for(let i=0;i<p.count;i++)out.push((m.isSkinnedMesh?m.getVertexPosition(i,v):v.fromBufferAttribute(p,i)).applyMatrix4(m.matrixWorld).clone());});return out;};
const at=(a,n)=>a.joints[n].getWorldPosition(new THREE.Vector3());

test('every Kop halts; a goblin, a gnome or nothing does not',()=>{
 for(const f of FAMILY)assert(halts(make(f)),f[0]);
 assert(!halts(createGoblin('goblin'))&&!halts(createGnome('gnome'))&&!halts(null));
});

test('the halt meets every goal under 2 cm on every Kop',()=>{
 for(const f of FAMILY){const worst=Math.max(...halt(f).residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${f[0]}: worst goal ${worst.toFixed(2)} cm`);}
});

test('the stopping arm is thrust straight out ahead at the shoulder\'s height, where the fist sat on the hip',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),r=halt(f),fist=P['paw:lf']().clone();
  const arm=at(a,'lfore_0').distanceTo(at(a,'lfore_1'))+at(a,'lfore_1').distanceTo(at(a,'lfore_2'));
  birdPoser(a).apply(r.pose);
  const wrist=at(a,'lfore_2'),sh=P['shoulder:l']();
  assert(wrist.z-P.withers().z>(HALT.reach-.05)*r.stand,`${f[0]}: wrist ${((wrist.z-P.withers().z)/r.stand).toFixed(2)} of the hip height ahead`);
  assert(Math.abs(wrist.y-sh.y)<(HALT.level+.05)*r.stand,`${f[0]}: wrist at the shoulder's height`);
  assert(at(a,'lfore_0').distanceTo(wrist)>(HALT.straight-.05)*arm,`${f[0]}: the arm locked straight`);
  assert(wrist.x<0&&wrist.x>sh.x,`${f[0]}: on its own side, in from the shoulder`);
  assert(P['paw:lf']().y-fist.y>.3*r.stand,`${f[0]}: the fist came up off the hip`);}
});

test('the truncheon fist is high over the face, drawn back behind the withers, over its own shoulder',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),r=halt(f),before=P['paw:rf']().clone();
  birdPoser(a).apply(r.pose);
  const fist=P['paw:rf']();
  assert(fist.y>r.mouth+(HALT.raise-.05)*r.stand,`${f[0]}: fist at ${fist.y.toFixed(3)}`);
  assert(fist.y>=before.y-.01,`${f[0]}: no lower than it is carried`);
  assert(fist.z<P.withers().z-(HALT.cock-.06)*r.stand&&fist.z<before.z-.05,`${f[0]}: drawn back`);
  assert(fist.x>0&&fist.x<P['shoulder:r']().x*(1+HALT.wide)+.01,`${f[0]}: over its shoulder, not flung wide`);}
});

test('rocked back on its heels, chin up, the boots exactly where they stood',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),r=halt(f),feet=['l','r'].map(s=>P[`paw:${s}h`]().clone());
  const legs=Object.keys(a.joints).filter(n=>/leg/.test(n)).map(n=>[n,a.joints[n].rotation.toArray().slice(0,3)]);
  birdPoser(a).apply(r.pose);
  assert(P.withers().z<P.rump().z-(HALT.lean-.03)*r.stand,`${f[0]}: withers behind the pelvis`);
  assert(P.mouth().y>r.mouth-(HALT.chin+.02)*r.stand,`${f[0]}: chin up`);
  ['l','r'].forEach((s,i)=>assert(P[`paw:${s}h`]().distanceTo(feet[i])<1e-6,`${f[0]} ${s}: boot planted`));
  for(const [n,rot] of legs)assert.deepEqual(a.joints[n].rotation.toArray().slice(0,3),rot,`${f[0]} ${n}: legs not posed`);}
});

test('nothing through the floor or the trunk: every vertex of every mesh, both fists clear of the spine',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,standing=Math.min(...vertices(a).map(v=>v.y)),P=rolesOf(a);
  birdPoser(a).apply(halt(f).pose);
  const low=Math.min(...vertices(a).map(v=>v.y));
  assert(low>Math.min(standing,floor)-.005,`${f[0]}: lowest ${((low-floor)*100).toFixed(1)} cm`);
  const w=P.withers();
  for(const s of ['l','r']){const h=P[`paw:${s}f`]();assert(Math.hypot(h.x-w.x,h.z-w.z)>.05*a.g.scale.x,`${f[0]} ${s}: fist clear of the trunk`);}
  a.g.updateMatrixWorld(true);
  assert(new THREE.Box3().setFromObject(a.hat,true).min.y>w.y,`${f[0]}: helmet above the withers`);}
});

test('posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const f of FAMILY){const a=make(f),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  haltPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${f[0]} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
