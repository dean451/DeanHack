import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {KOBOLDS,createKobold} from './kobold.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

const make = name => { const a = createKobold(name); a.g.updateMatrixWorld(true); return a; };
const ROLES = ['head', 'mouth', 'chin', 'withers', 'rump', 'tailtip', 'paw:lf', 'paw:rf', 'paw:lh', 'paw:rh', 'hip:l', 'hip:r', 'shoulder:l', 'shoulder:r'];

test('every role resolves to a finite world point on every kobold; it has no wings', () => {
  assert(KOBOLDS.length >= 4);
  for (const name of KOBOLDS) {
    const P = rolesOf(make(name));
    for (const r of ROLES) assert(P[r]().toArray().every(Number.isFinite), `${name}: ${r}`);
    assert.throws(() => P['wingtip:l'], /no role/, `${name}: wingtip`);
  }
});

test('the roles sit where their names say: left on -x, the face forward, the tail behind', () => {
  for (const name of KOBOLDS) {
    const P = rolesOf(make(name)), at = r => P[r]();
    assert(at('paw:lf').x < 0 && at('paw:rf').x > 0 && at('paw:lh').x < 0 && at('paw:rh').x > 0, `${name}: sides`);
    assert(at('shoulder:l').x < 0 && at('hip:r').x > 0, `${name}: shoulders and hips`);
    assert(at('mouth').z > at('head').z, `${name}: mouth forward of the head pivot`);
    assert(at('chin').y < at('mouth').y, `${name}: chin under the mouth`);
    assert(at('withers').y > at('rump').y, `${name}: withers above the rump`);
    assert(at('tailtip').z < at('rump').z, `${name}: tail behind`);
  }
});

test('the feet stand on the floor within 1 cm at rest', () => {
  for (const name of KOBOLDS) {
    const a = make(name), P = rolesOf(a), floor = a.g.position.y;
    for (const r of ['paw:lh', 'paw:rh']) assert(Math.abs(P[r]().y - floor) < .01, `${name} ${r} at ${P[r]().y - floor}`);
  }
});

test('a paw follows its bent leg and arm; another stays', () => {
  for (const name of KOBOLDS) {
    const a = make(name), P = rolesOf(a), hind = P['paw:lh'](), fore = P['paw:rf'](), other = P['paw:rh']();
    a.joints.lleg1_0.rotation.x = .8; a.joints.rfore_0.rotation.x = -.6; a.g.updateMatrixWorld(true);
    assert(P['paw:lh']().distanceTo(hind) > .02, `${name}: the hind paw swung`);
    assert(P['paw:rf']().distanceTo(fore) > .02, `${name}: the forepaw swung`);
    assert(P['paw:rh']().distanceTo(other) < 1e-9, `${name}: another paw stayed`);
  }
});

test('a goal written on roles solves through the neck: the mouth reaches a point it can swing to, under 2 cm', () => {
  for (const name of KOBOLDS) {
    const a = make(name), j = a.joints, P = rolesOf(a), keys = ['x', 'y', 'z'];
    const apply = pose => { for (const n of ['neck1', 'neck2']) for (const ax of keys) j[n].rotation[ax] = pose[n]?.[ax] || 0; a.g.updateMatrixWorld(true); };
    const joints = {}; for (const n of ['neck1', 'neck2']) for (const ax of keys) joints[`${n}.${ax}`] = [-1, 1];
    const pivot = new THREE.Vector3().setFromMatrixPosition(j.neck1.matrixWorld), target = P.mouth().sub(pivot).applyEuler(new THREE.Euler(.4, -.3, 0)).add(pivot);
    solvePose({joints, goals: [goal.reach('mouth', target, {within: 0})], apply, points: P, rest: 0, iterations: 200});
    const cm = P.mouth().distanceTo(target) * 100;
    assert(cm < 2, `${name}: mouth ${cm.toFixed(2)} cm from the point`);
  }
});
