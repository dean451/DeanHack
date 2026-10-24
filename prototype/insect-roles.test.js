import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

const FAMILY=['giant ant','soldier ant','fire ant','snow ant','killer bee','queen bee','giant beetle','locust'];
const make=name=>{const a=createCreature({name,symbol:97,color:3});a.g.updateMatrixWorld(true);return a;};
const ROLES=['head','mouth','chin','withers','rump','tailtip','paw:lf','paw:rf','paw:lm','paw:rm','paw:lh','paw:rh','hip:l','hip:r','shoulder:l','shoulder:r'];
const BEE=/ bee$/;
const PAWS=['paw:lf','paw:rf','paw:lm','paw:rm','paw:lh','paw:rh'];

test('every role resolves to a finite world point on every ant, bee, beetle and locust (and the bees\' wing tips)',()=>{
 for(const name of FAMILY){const P=rolesOf(make(name));
  for(const r of ROLES)assert(P[r]().toArray().every(Number.isFinite),`${name}: ${r}`);
  if(BEE.test(name))for(const r of ['wingtip:l','wingtip:r'])assert(P[r]().toArray().every(Number.isFinite),`${name}: ${r}`);}
});

test('the roles sit where their names say: left on -x, front feet ahead of the middle ahead of the hind, mouth forward, abdomen behind',()=>{
 for(const name of FAMILY){const P=rolesOf(make(name)),at=r=>P[r]();
  for(const s of ['l','r'])for(const p of ['f','m','h'])assert(s==='l'?at(`paw:${s}${p}`).x<0:at(`paw:${s}${p}`).x>0,`${name}: paw:${s}${p} side`);
  for(const s of ['l','r'])assert(at(`paw:${s}f`).z>at(`paw:${s}m`).z&&at(`paw:${s}m`).z>at(`paw:${s}h`).z,`${name}: ${s} feet front to back`);
  assert(at('mouth').z>at('head').z&&at('mouth').z>at('withers').z,`${name}: mouth forward`);
  assert(at('chin').y<at('mouth').y+1e-9,`${name}: chin not above the mouth`);
  assert(at('tailtip').z<at('rump').z&&at('rump').z<at('withers').z,`${name}: abdomen behind`);
  assert(at('shoulder:l').z>at('hip:l').z,`${name}: shoulders ahead of hips`);
  if(BEE.test(name))assert(at('wingtip:l').x<0&&at('wingtip:r').x>0,`${name}: wing tips`);
 }
});

test('the six feet stand on the floor within 1 cm at rest (a bee hovers: its feet hang below its body instead)',()=>{
 for(const name of FAMILY){const a=make(name),P=rolesOf(a),floor=a.g.position.y;
  if(BEE.test(name)){const belly=new THREE.Box3().setFromObject(a.body.children.find(o=>o.userData.part==='body')).min.y;for(const r of PAWS)assert(P[r]().y<belly&&P[r]().y>floor,`${name} ${r} hangs below the body`);continue;}
  for(const r of PAWS)assert(Math.abs(P[r]().y-floor)<.01,`${name} ${r} at ${((P[r]().y-floor)*100).toFixed(2)} cm`);}
});

test('a paw follows its leg\'s bones: bending the femur and tibia carries the claw with them',()=>{
 for(const name of FAMILY){const a=make(name),j=a.joints,P=rolesOf(a),before=P['paw:rf']();
  j.rleg0_1.rotation.z+=.4;a.g.updateMatrixWorld(true);
  assert(P['paw:rf']().distanceTo(before)>.005,`${name}: the paw moved with the femur`);
  assert(P['paw:lf']().toArray().every(Number.isFinite));
 }
});

test('a goal written on roles solves through a leg\'s three joints: the front claw reaches a point lifted and forward, under 2 cm',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints,P=rolesOf(a),names=['rleg0_0','rleg0_1','rleg0_2'],rest=Object.fromEntries(names.map(n=>[n,j[n].rotation.clone()]));
  const apply=pose=>{for(const n of names)for(const ax of ['x','y','z'])j[n].rotation[ax]=rest[n][ax]+(pose[n]?.[ax]||0);a.g.updateMatrixWorld(true);};
  const joints={};for(const n of names)for(const ax of ['x','y','z'])joints[`${n}.${ax}`]=[-1.2,1.2];
  // a point the claw can reach: lifted off the floor and forward by a fifth of the leg's own reach
  const hip=P['shoulder:r'](),paw=P['paw:rf'](),reach=paw.distanceTo(hip),target=paw.clone().add(new THREE.Vector3(0,reach*.25,reach*.2));
  solvePose({joints,goals:[goal.reach('paw:rf',target,{within:0})],apply,points:P,rest:0,iterations:200});
  const cm=P['paw:rf']().distanceTo(target)*100;
  assert(cm<2,`${name}: claw ${cm.toFixed(2)} cm from the point`);
 }
});
