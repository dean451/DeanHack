import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFeline} from './feline.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

const FAMILY=['jaguar','lynx','panther','tiger','displacer beast'];
const make=name=>{const a=createFeline(name);a.g.updateMatrixWorld(true);return a;};
const ROLES=['head','mouth','chin','withers','rump','tailtip','paw:lf','paw:rf','paw:lh','paw:rh','hip:l','hip:r','shoulder:l','shoulder:r'];

test('every role resolves to a finite world point on every wild cat',()=>{
 for(const name of FAMILY){const P=rolesOf(make(name));
  for(const r of ROLES)assert(P[r]().toArray().every(Number.isFinite),`${name}: ${r}`);}
});

test('the roles sit where their names say: left on -x, the nose forward, the tail behind',()=>{
 for(const name of FAMILY){const P=rolesOf(make(name)),at=r=>P[r]();
  assert(at('paw:lf').x<0&&at('paw:rf').x>0&&at('paw:lh').x<0&&at('paw:rh').x>0,`${name}: sides`);
  assert(at('shoulder:l').x<0&&at('hip:r').x>0,`${name}: shoulders and hips`);
  assert(at('paw:lf').z>at('paw:lh').z,`${name}: fore feet ahead of the hind`);
  assert(at('mouth').z>at('head').z&&at('mouth').z>at('withers').z,`${name}: nose forward`);
  assert(at('tailtip').z<at('rump').z&&at('rump').z<at('withers').z,`${name}: tail behind`);
  assert(at('chin').y<at('mouth').y,`${name}: chin under the mouth`);
  assert(at('shoulder:l').z>at('hip:l').z,`${name}: shoulder ahead of the hip`);
 }
});

test('the feet stand on the floor within 1 cm at rest',()=>{
 for(const name of FAMILY){const a=make(name),P=rolesOf(a),floor=a.g.position.y;
  for(const r of ['paw:lf','paw:rf','paw:lh','paw:rh'])assert(Math.abs(P[r]().y-floor)<.01,`${name} ${r} at ${P[r]().y-floor}`);}
});

test('a paw follows its bent leg and the pet cat keeps its own map',()=>{
 const a=make('tiger'),P=rolesOf(a),before=P['paw:lf'](),other=P['paw:rh']();
 a.joints.lleg0_1.rotation.x=.8;a.g.updateMatrixWorld(true);
 assert(P['paw:lf']().distanceTo(before)>.05,'the forepaw swung with the elbow');
 assert(P['paw:rh']().distanceTo(other)<1e-9,'another paw stayed');
 assert.throws(()=>rolesOf({quirk:'feline',joints:{}}),/no role map/);
});

test('a goal written on roles solves on the wild cats through the neck: the nose reaches a point it can swing to, under 2 cm',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints,P=rolesOf(a),keys=['x','y','z'],bones=['neck0','neck1','neck2','neck3'];
  const apply=pose=>{for(const b of bones)for(const ax of keys)j[b].rotation[ax]=pose[b]?.[ax]||0;a.g.updateMatrixWorld(true);};
  const joints={};for(const b of bones)for(const ax of keys)joints[`${b}.${ax}`]=[-.5,.5];
  const pivot=P.withers(),target=P.mouth().sub(pivot).applyEuler(new THREE.Euler(.5,-.3,0)).add(pivot);
  solvePose({joints,goals:[goal.reach('mouth',target,{within:0})],apply,points:P,rest:0,iterations:300});
  const cm=P.mouth().distanceTo(target)*100;
  assert(cm<2,`${name}: nose ${cm.toFixed(2)} cm from the point`);
 }
});
