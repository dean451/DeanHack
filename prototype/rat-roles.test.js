import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

// Stage 3 of the creature plan for the rats (family r): one role map covers every member.
const FAMILY=['enormous rat','giant rat','rabid rat','sewer rat'];
const make=name=>{const a=createCreature({name,symbol:114,color:7});a.g.updateMatrixWorld(true);return a;};
const ROLES=['head','mouth','chin','withers','rump','tailtip','paw:lf','paw:rf','paw:lh','paw:rh','hip:l','hip:r','shoulder:l','shoulder:r'];

test('every role resolves to a finite world point on every member',()=>{
 for(const name of FAMILY){const P=rolesOf(make(name));
  for(const r of ROLES)assert(P[r]().toArray().every(Number.isFinite),`${name}: ${r}`);}
});

test('the roles sit where their names say: left on -x, the face forward, the tail behind',()=>{
 for(const name of FAMILY){const P=rolesOf(make(name)),at=r=>P[r]();
  assert(at('paw:lf').x<0&&at('paw:rf').x>0&&at('paw:lh').x<0&&at('paw:rh').x>0,`${name}: sides`);
  assert(at('shoulder:l').x<0&&at('hip:r').x>0,`${name}: shoulders and hips`);
  assert(at('paw:lf').z>at('paw:lh').z,`${name}: fore feet ahead of the hind`);
  assert(at('shoulder:l').z>at('hip:l').z,`${name}: shoulder ahead of the hip`);
  assert(at('mouth').z>at('head').z,`${name}: mouth forward of the head pivot`);
  assert(at('chin').y<at('mouth').y,`${name}: chin under the mouth`);
  assert(at('tailtip').z<at('rump').z,`${name}: tail behind`);
 }
});

test('the feet stand on the floor within 1 cm at rest',()=>{
 for(const name of FAMILY){const a=make(name),P=rolesOf(a),floor=a.g.position.y;
  for(const r of ['paw:lf','paw:rf','paw:lh','paw:rh'])assert(Math.abs(P[r]().y-floor)<.01,`${name} ${r} at ${P[r]().y-floor}`);}
});

test('a paw follows its bent leg; another stays; the tail tip follows the tail',()=>{
 for(const name of FAMILY){const a=make(name),P=rolesOf(a),before=P['paw:lf'](),other=P['paw:rh'](),tip=P.tailtip();
  a.joints.lleg0_1.rotation.x=.8;a.joints.tail0.rotation.x=.6;a.g.updateMatrixWorld(true);
  assert(P['paw:lf']().distanceTo(before)>.02,`${name}: the forepaw swung`);
  assert(P['paw:rh']().distanceTo(other)<1e-9,`${name}: another paw stayed`);
  assert(P.tailtip().distanceTo(tip)>.02,`${name}: the tail tip swung`);}
});

test('a goal written on roles solves: the mouth reaches a point the head can swing to, under 2 cm',()=>{
 for(const name of FAMILY){
  const a=make(name),P=rolesOf(a),neck=a.joints.neck0,keys=['x','y','z'];
  const apply=pose=>{for(const ax of keys)neck.rotation[ax]=pose[ax]||0;a.g.updateMatrixWorld(true);};
  // the target is where the mouth lands when the head is turned a known amount, so it is reachable by construction
  apply({x:.25,y:-.2,z:.05});const target=P.mouth();apply({});
  solvePose({joints:Object.fromEntries(keys.map(ax=>[`neck0.${ax}`,[-.5,.5]])),goals:[goal.reach('mouth',target,{within:0})],apply:p=>apply(p.neck0||{}),points:P,rest:0,iterations:300});
  const cm=P.mouth().distanceTo(target)*100;
  assert(cm<2,`${name}: mouth ${cm.toFixed(2)} cm from the point`);
  apply({});
 }
});
