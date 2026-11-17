import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

// Stage 3 of the creature plan for the nagas (family N): `createNaga` rigs the raised neck (`neck0`..`neck4`, the
// `head` bone) and the coil (`tail0` where it rises to `tail11` at the tip), so `rolesOf` maps them through
// `nagaRoles`: the mouth and chin at the points the builder names on the face, the withers and rump where neck and
// coil meet, the tail tip at the coil's point. There are no legs: what rests on the floor is the coil's belly.
const NAMES = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const BODY = ['head', 'mouth', 'chin', 'withers', 'rump', 'tailtip'];
const make = name => { const a = createCreature({name, symbol: 78}); a.g.updateMatrixWorld(true); return a; };
const world = o => o.getWorldPosition(new THREE.Vector3());
// the lowest point of a skinned mesh as posed, in the world
function lowest(m) {
  m.skeleton.update();
  const v = new THREE.Vector3(); let lo = Infinity;
  for (let i = 0; i < m.geometry.attributes.position.count; i++) { m.getVertexPosition(i, v); lo = Math.min(lo, v.applyMatrix4(m.matrixWorld).y); }
  return lo;
}
const part = (a, name) => { let out; a.g.traverse(o => { if (o.userData.part === name) out = o; }); return out; };

test('every role resolves to a finite world point on every naga and hatchling; there are no legs and no wings', () => {
  for (const name of NAMES) {
    const P = rolesOf(make(name));
    for (const r of BODY) assert(P[r]().toArray().every(Number.isFinite), `${name}: ${r}`);
    for (const r of ['paw:lf', 'paw:rh', 'hip:l', 'shoulder:r', 'wingtip:l']) assert.throws(() => P[r], /no role/, `${name}: no ${r}`);
  }
});

test('the roles sit where their names say: the face forward and high, the chin under the mouth, the tail tip out at the coil', () => {
  for (const name of NAMES) {
    const a = make(name), P = rolesOf(a), at = r => P[r](), s = a.g.scale.y;
    assert(at('mouth').z > at('head').z + .05 * s, `${name}: the mouth ahead of the head's pivot`);
    assert(at('mouth').distanceTo(at('head')) < .2 * s, `${name}: the mouth on the head`);
    assert(Math.abs(at('mouth').x) < .01 * s, `${name}: the mouth on the middle line`);
    assert(at('chin').y < at('mouth').y - .01 * s, `${name}: the chin under the mouth`);
    assert(at('mouth').y > at('withers').y + .3 * s, `${name}: the face held up high over the coil`);
    assert(at('withers').distanceTo(world(a.tail)) < 1e-9, `${name}: the withers where the neck leaves the coil`);
    assert(at('rump').distanceTo(at('withers')) < .02 * s, `${name}: the rump where the coil rises, by the withers`);
    assert(at('tailtip').distanceTo(at('rump')) > .3 * s, `${name}: the tail tip out at the coil's far end`);
  }
});

test('the mouth is at the open mouth between the fangs, inside the head\'s own mesh box', () => {
  for (const name of NAMES) {
    const a = make(name), P = rolesOf(a), box = new THREE.Box3().setFromObject(part(a, 'head'));
    const m = P.mouth(), c = P.chin();
    assert(box.containsPoint(m), `${name}: the mouth inside the head`);
    assert(box.expandByScalar(.005).containsPoint(c), `${name}: the chin on the head`);
    // (the muzzle juts past the mouth, so the mouth is in the front few centimetres, in the head's lower half)
    assert(m.z > box.max.z - .05 * a.g.scale.y, `${name}: the mouth at the front of the face`);
    assert(m.y < (box.min.y + box.max.y) / 2, `${name}: the mouth in the head's lower half, under the eyes`);
  }
});

test('at rest the coil lies on the floor within 1 cm (it has no feet), and the tail tip is the coil\'s point', () => {
  for (const name of NAMES) {
    const a = make(name), P = rolesOf(a), floor = a.g.position.y, coil = part(a, 'coil');
    const lo = lowest(coil);
    assert(Math.abs(lo - floor) < .01, `${name}: the coil's belly ${((lo - floor) * 100).toFixed(2)} cm off the floor`);
    // the tube's first ring is its point: the tail tip is within a centimetre of it
    const ring = new THREE.Vector3(), tipRing = new THREE.Vector3(), n = 7;
    for (let i = 0; i < n; i++) { coil.getVertexPosition(i, ring); tipRing.add(ring.applyMatrix4(coil.matrixWorld)); }
    tipRing.divideScalar(n);
    assert(P.tailtip().distanceTo(tipRing) < .01, `${name}: the tail tip ${(P.tailtip().distanceTo(tipRing) * 100).toFixed(2)} cm from the coil's point`);
  }
});

test('a bowed neck carries the mouth and chin and leaves the coil; a turned coil carries the tail tip and leaves the face', () => {
  for (const name of NAMES) {
    const a = make(name), j = a.joints, P = rolesOf(a);
    const mouth = P.mouth(), chin = P.chin(), tip = P.tailtip(), rump = P.rump(), withers = P.withers();
    j.neck1.rotation.x = .5; j.neck3.rotation.x = .4; a.g.updateMatrixWorld(true);
    assert(P.mouth().distanceTo(mouth) > .05 && P.chin().distanceTo(chin) > .05, `${name}: the face moved with the neck`);
    assert(P.tailtip().distanceTo(tip) < 1e-9 && P.rump().distanceTo(rump) < 1e-9 && P.withers().distanceTo(withers) < 1e-9, `${name}: the coil stayed`);
    j.neck1.rotation.x = 0; j.neck3.rotation.x = 0; j.tail5.rotation.y = .6; a.g.updateMatrixWorld(true);
    assert(P.tailtip().distanceTo(tip) > .03, `${name}: the tail tip swung with the coil`);
    assert(P.mouth().distanceTo(mouth) < 1e-9 && P.rump().distanceTo(rump) < 1e-9, `${name}: the face and the coil's root stayed`);
    j.tail5.rotation.y = 0; j.head.rotation.x = .5; a.g.updateMatrixWorld(true);
    assert(P.mouth().distanceTo(mouth) > .02, `${name}: a nodded head carries the mouth`);
    j.head.rotation.x = 0; a.g.updateMatrixWorld(true);
    assert(P.mouth().distanceTo(mouth) < 1e-9 && P.tailtip().distanceTo(tip) < 1e-9, `${name}: back at rest, back where they were`);
  }
});

test('a goal written on roles solves: the mouth reaches a point the neck can bow it to, the tail tip one the coil can swing it to, under 2 cm', () => {
  for (const name of NAMES) {
    const a = make(name), j = a.joints, P = rolesOf(a), keys = ['x', 'y', 'z'];
    const run = (names, role, euler, pivotJoint) => {
      const apply = pose => { for (const n of names) for (const ax of keys) j[n].rotation[ax] = pose[n]?.[ax] || 0; a.g.updateMatrixWorld(true); };
      const joints = {}; for (const n of names) for (const ax of keys) joints[`${n}.${ax}`] = [-1.4, 1.4];
      const pivot = world(pivotJoint), target = P[role]().sub(pivot).applyEuler(euler).add(pivot);
      solvePose({joints, goals: [goal.reach(role, target, {within: 0})], apply, points: P, rest: 0, iterations: 300});
      const cm = P[role]().distanceTo(target) * 100; assert(cm < 2, `${name}: ${role} ${cm.toFixed(2)} cm from the point`);
      apply({});
      for (const n of names) for (const ax of keys) assert.equal(j[n].rotation[ax], 0, `${name}: ${n}.${ax} back at rest`);
    };
    run(['neck1', 'neck2', 'neck3'], 'mouth', new THREE.Euler(.45, -.35, 0), j.neck1);
    run(['tail8', 'tail9', 'tail10'], 'tailtip', new THREE.Euler(0, .5, 0), j.tail8);
  }
});

test('the snakes are not mapped as nagas', () => {
  const a = createCreature({name: 'cobra', symbol: 83});
  assert.notEqual(a.kind, 'naga');
});
