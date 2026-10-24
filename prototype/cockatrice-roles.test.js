import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

const FAMILY=['chickatrice','cockatrice','pyrolisk'];
const make=name=>{const a=createCreature({name,symbol:99,color:11});a.g.updateMatrixWorld(true);return a;};
const ROLES=['head','mouth','chin','withers','rump','tailtip','paw:lf','paw:rf','paw:lh','paw:rh','hip:l','hip:r','shoulder:l','shoulder:r','wingtip:l','wingtip:r','wingwrist:l','wingwrist:r'];

test('every role resolves to a finite world point on every member of the family',()=>{
 for(const name of FAMILY){const P=rolesOf(make(name));
  for(const r of ROLES)assert(P[r]().toArray().every(Number.isFinite),`${name}: ${r}`);}
});

test('the roles sit where their names say, left on -x, the beak forward and the tail behind',()=>{
 for(const name of FAMILY){const P=rolesOf(make(name)),at=r=>P[r]();
  assert(at('paw:lf').x<0&&at('paw:rf').x>0&&at('wingtip:l').x<0&&at('wingtip:r').x>0,`${name}: sides`);
  assert(at('paw:lf').z>at('paw:lh').z,`${name}: fore feet ahead of the hind`);
  assert(at('mouth').z>at('head').z&&at('mouth').z>at('withers').z,`${name}: beak forward`);
  assert(at('tailtip').z<at('rump').z&&at('rump').z<at('withers').z,`${name}: tail behind`);
  assert(at('chin').y<at('mouth').y,`${name}: chin under the mouth`);
  assert(at('wingtip:l').distanceTo(at('rump'))>.02,`${name}: wing tip is a point`);
 }
});

test('the feet stand on the floor within 1 cm at rest',()=>{
 for(const name of FAMILY){const a=make(name),P=rolesOf(a),floor=a.g.position.y;
  for(const r of ['paw:lf','paw:rf','paw:lh','paw:rh'])assert(Math.abs(P[r]().y-floor)<.01,`${name} ${r} at ${P[r]().y-floor}`);}
});

test('a goal written on roles solves on the family through the neck: the beak reaches a point it can swing to (down 29 degrees, turned 17 degrees), under 2 cm',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints,P=rolesOf(a),keys=['x','y','z'];
  const apply=pose=>{for(const ax of keys)j.neck0.rotation[ax]=pose.neck0?.[ax]||0;a.g.updateMatrixWorld(true);};
  const joints={};for(const ax of keys)joints[`neck0.${ax}`]=[-1.4,1.4];
  const pivot=P.head(),target=P.mouth().sub(pivot).applyEuler(new THREE.Euler(.5,-.3,0)).add(pivot);
  solvePose({joints,goals:[goal.reach('mouth',target,{within:0})],apply,points:P,rest:0,iterations:200});
  const cm=P.mouth().distanceTo(target)*100;
  assert(cm<2,`${name}: mouth ${cm.toFixed(2)} cm from the point`);
 }
});
