import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

// Stage 3 of the creature plan for the Kops (family K): `kop()` rigs them on the humanoids' joints (`rigBody`:
// three-bone limbs, `spine0`, `spine1`, `neck0`..`neck3`, no tail), so `rolesOf` maps them through `humanoidRoles`,
// with the custodian helmet as the actor's `hat` (left out of the head's box); this checks the map holds on every Kop.
const FAMILY=['keystone kop','kop sergeant','kop lieutenant','kop kaptain'].map(n=>[n,()=>createCreature({name:n,symbol:75,color:4})]);
const make=([,build])=>{const a=build();a.g.updateMatrixWorld(true);return a;};
const BODY=['head','mouth','chin','withers','rump','paw:lf','paw:rf','paw:lh','paw:rh','hip:l','hip:r','shoulder:l','shoulder:r'];

test('every role resolves to a finite world point on every member; there is no tail',()=>{
 for(const f of FAMILY){const P=rolesOf(make(f));
  for(const r of BODY)assert(P[r]().toArray().every(Number.isFinite),`${f[0]}: ${r}`);
  assert.throws(()=>P.tailtip,/no role/,`${f[0]}: no tail`);}
});

test('the roles sit where their names say: left on -x, the face forward, the head above the rump',()=>{
 for(const f of FAMILY){const P=rolesOf(make(f)),at=r=>P[r](),name=f[0];
  assert(at('paw:lh').x<0&&at('paw:rh').x>0&&at('paw:lf').x<0&&at('paw:rf').x>0,`${name}: sides`);
  assert(at('shoulder:l').x<0&&at('hip:r').x>0,`${name}: shoulders and hips`);
  assert(at('mouth').z>at('head').z,`${name}: mouth forward of the head pivot`);
  assert(at('chin').y<at('mouth').y,`${name}: chin under the mouth`);
  assert(at('mouth').y>at('head').y&&at('chin').y>at('withers').y,`${name}: the head pivots at the collar, so mouth and chin are over it and the neck's root`);
  assert(at('withers').y>at('rump').y&&at('shoulder:l').y>at('hip:l').y,`${name}: neck above the pelvis`);
 }
});

test('the feet stand on the floor within 1 cm at rest; the left fist is down on the hip, the right raised with the truncheon',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),floor=a.g.position.y,name=f[0];
  for(const r of ['paw:lh','paw:rh'])assert(Math.abs(P[r]().y-floor)<.01,`${name} ${r} at ${P[r]().y-floor}`);
  assert(P['paw:lf']().y<P['shoulder:l']().y-.1,`${name}: the left fist is down by the hip`);
  assert(P['paw:rf']().y>P['shoulder:r']().y+.1,`${name}: the right fist is up`);
  const club=a.tail.getWorldPosition(new THREE.Vector3());
  assert(P['paw:rf']().distanceTo(club)<.12*a.g.scale.y,`${name}: the right hand is at the truncheon's grip`);}
});

test('a paw follows its bent limb; another stays',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),foot=P['paw:lh'](),hand=P['paw:rf'](),other=P['paw:rh']();
  a.joints.lleg1_1.rotation.x=.8;a.joints.rfore_1.rotation.x=-.8;a.g.updateMatrixWorld(true);
  assert(P['paw:lh']().distanceTo(foot)>.05,`${f[0]}: the foot swung`);
  assert(P['paw:rf']().distanceTo(hand)>.05,`${f[0]}: the hand swung`);
  assert(P['paw:rh']().distanceTo(other)<1e-9,`${f[0]}: another foot stayed`);}
});

test('a goal written on roles solves: the right hand reaches a point lifted and forward, and the mouth one the neck can swing to, under 2 cm',()=>{
 for(const f of FAMILY){
  const a=make(f),j=a.joints,P=rolesOf(a),keys=['x','y','z'];
  const run=(names,role,euler,pivotJoint)=>{
   const apply=pose=>{for(const n of names)for(const ax of keys)j[n].rotation[ax]=pose[n]?.[ax]||0;a.g.updateMatrixWorld(true);};
   const joints={};for(const n of names)for(const ax of keys)joints[`${n}.${ax}`]=[-1.4,1.4];
   const pivot=new THREE.Vector3().setFromMatrixPosition(pivotJoint.matrixWorld),target=P[role]().sub(pivot).applyEuler(euler).add(pivot);
   solvePose({joints,goals:[goal.reach(role,target,{within:0})],apply,points:P,rest:0,iterations:300});
   const cm=P[role]().distanceTo(target)*100;assert(cm<2,`${f[0]}: ${role} ${cm.toFixed(2)} cm from the point`);
   apply({});};
  run(['rfore_0','rfore_1','rfore_2'],'paw:rf',new THREE.Euler(-.7,0,.2),j.rfore_0);
  run(['neck1','neck2'],'mouth',new THREE.Euler(.4,-.3,0),j.neck1);
 }
});


test('the mouth and chin sit on the face, not up the helmet: the helmet is the actor\'s hat and is left out of the head\'s box',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),head=P.head(),s=a.g.scale.y,name=f[0];
  assert(a.hat&&a.hat.parent===a.joints.head,`${name}: the helmet rides the head`);
  for(const r of ['mouth','chin']){const p=P[r]();
   assert(p.distanceTo(head)<.2*s,`${name}: ${r} ${p.distanceTo(head).toFixed(3)} from the head pivot`);
   assert(p.y>P.withers().y,`${name}: ${r} above the neck's root`);}
  // the face sphere is .1 across at the head's centre, .085 over the pivot (scaled): the mouth under its middle, on its front
  const face=a.joints.head.localToWorld(new THREE.Vector3(0,.085,.01));
  assert(P.mouth().y<face.y,`${name}: the mouth is under the middle of the face`);
  assert(P.mouth().z>face.z+.05*s,`${name}: the mouth is on the face's front`);
  // under the bruised nose (built at the face's middle less .01) and the chin over the moustache's drooping tips (.1 under it)
  const nose=a.joints.head.localToWorld(new THREE.Vector3(0,.075,.1)),tips=a.joints.head.localToWorld(new THREE.Vector3(0,-.015,0));
  assert(P.mouth().y<nose.y-.01*s&&P.chin().y<P.mouth().y-.01*s&&P.chin().y>tips.y,`${name}: nose, mouth, chin, then the moustache's tips`);}
});

test('the helmet adds no motion: no gait runs on a kop, so nothing nods it',async()=>{
 const {gaitKind}=await import('./gait.js');
 for(const f of FAMILY)assert.equal(gaitKind(make(f)),null,f[0]);
});
