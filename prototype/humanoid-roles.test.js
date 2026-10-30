import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHobbit} from './hobbit.js';
import {createBugbear} from './bugbear.js';
import {DWARVES,createDwarf} from './dwarf.js';
import {MIND_FLAYER_KINDS,createMindFlayer} from './mind-flayer.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

const FAMILY=[['hobbit',createHobbit],['bugbear',createBugbear],
 ...DWARVES.map(n=>[n,()=>createDwarf(n)]),
 ...Object.keys(MIND_FLAYER_KINDS).map(n=>[n,()=>createMindFlayer(n)])];
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
  assert(at('mouth').y<at('head').y&&at('mouth').y>at('withers').y-.05,`${name}: mouth under the head pivot, not far under the neck's root`);
  assert(at('withers').y>at('rump').y&&at('shoulder:l').y>at('hip:l').y,`${name}: neck above the pelvis`);
 }
});

test('the feet stand on the floor within 1 cm at rest, the hands hang below the shoulders',()=>{
 for(const f of FAMILY){const a=make(f),P=rolesOf(a),floor=a.g.position.y,name=f[0];
  for(const r of ['paw:lh','paw:rh'])assert(Math.abs(P[r]().y-floor)<.01,`${name} ${r} at ${P[r]().y-floor}`);
  for(const s of ['l','r'])assert(P[`paw:${s}f`]().y<P[`shoulder:${s}`]().y-.1,`${name}: ${s} hand hangs`);}
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
