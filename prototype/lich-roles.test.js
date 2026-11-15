import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

// Stage 3 of the creature plan for the liches (family L): `lich()` rigs the trunk and neck (`hips` at the floor,
// `spine0`, `spine1`, `neck0`..`neck3`), the jaw and the three-bone arms, but no legs (the robe reaches the floor),
// so `rolesOf` maps them through `lichRoles`: the feet under the robe in the floor bone's frame, the hands at the
// claws' knuckles, the mouth and chin on the jaw. This checks the map holds on every lich.
const FAMILY = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6], ['unknown L', 3]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 76, color}); a.g.updateMatrixWorld(true); return a; };
const BODY = ['head', 'mouth', 'chin', 'withers', 'rump', 'paw:lf', 'paw:rf', 'paw:lh', 'paw:rh', 'hip:l', 'hip:r', 'shoulder:l', 'shoulder:r'];
const world = o => o.getWorldPosition(new THREE.Vector3());

test('every role resolves to a finite world point on every lich; there is no tail and no wing', () => {
  for (const f of FAMILY) {
    const P = rolesOf(make(f));
    for (const r of BODY) assert(P[r]().toArray().every(Number.isFinite), `${f[0]}: ${r}`);
    assert.throws(() => P.tailtip, /no role/, `${f[0]}: no tail`);
    assert.throws(() => P['wingtip:l'], /no role/, `${f[0]}: no wings`);
  }
});

test('the roles sit where their names say: left on -x, the teeth forward, the skull over the waist', () => {
  for (const f of FAMILY) {
    const P = rolesOf(make(f)), at = r => P[r](), name = f[0];
    for (const r of ['paw:lh', 'paw:lf', 'hip:l', 'shoulder:l']) assert(at(r).x < 0, `${name}: ${r} on the left`);
    for (const r of ['paw:rh', 'paw:rf', 'hip:r', 'shoulder:r']) assert(at(r).x > 0, `${name}: ${r} on the right`);
    assert(at('mouth').z > at('head').z, `${name}: mouth forward of the skull's pivot`);
    assert(at('chin').y < at('mouth').y, `${name}: chin under the mouth`);
    assert(at('withers').y > at('rump').y && at('shoulder:l').y > at('hip:l').y, `${name}: neck above the waist`);
    assert(at('hip:l').y > at('paw:lh').y + .2, `${name}: hips well over the feet`);
    assert(at('rump').y > at('hip:l').y, `${name}: the waist over the hips`);
  }
});

test('the mouth is at the skull\'s teeth: inside the face, under the sockets, over the skull\'s pivot', () => {
  for (const f of FAMILY) {
    const a = make(f), P = rolesOf(a), s = a.g.scale.y, name = f[0], m = P.mouth();
    // the sockets' glow at (±.06, 1.11, .18) as built, the skull's pivot at y .98 (scaled)
    const socket = a.head.localToWorld(new THREE.Vector3(0, 1.11 - .98, .18));
    assert(m.y < socket.y - .05 * s && m.y > world(a.head).y - .02 * s, `${name}: mouth between the pivot and the sockets`);
    assert(m.distanceTo(world(a.head)) < .2 * s, `${name}: mouth on the skull`);
    assert(Math.abs(m.z - socket.z) < .05 * s, `${name}: mouth on the face's front`);
  }
});

test('the feet stand on the floor within 1 cm at rest, inside the hem; the hands are the claws, by the robe', () => {
  for (const f of FAMILY) {
    const a = make(f), P = rolesOf(a), floor = a.g.position.y, s = a.g.scale.y, name = f[0];
    for (const r of ['paw:lh', 'paw:rh']) {
      assert(Math.abs(P[r]().y - floor) < .01, `${name} ${r} at ${P[r]().y - floor}`);
      assert(Math.hypot(P[r]().x, P[r]().z) < .3 * s, `${name} ${r} under the robe`);
    }
    for (const h of a.lichHands) {
      const r = h.side < 0 ? 'paw:lf' : 'paw:rf', p = P[r]();
      assert(p.distanceTo(world(h.fingers[1])) < 1e-9, `${name}: ${r} at the middle claw's knuckle`);
      assert(p.y < P[h.side < 0 ? 'shoulder:l' : 'shoulder:r']().y - .2 * s, `${name}: ${r} hangs below the shoulder`);
    }
  }
});

test('a hand follows its bent arm, the mouth its dropped jaw; the feet stay through a stoop', () => {
  for (const f of FAMILY) {
    const a = make(f), j = a.joints, P = rolesOf(a), name = f[0];
    const hand = P['paw:lf'](), other = P['paw:rf'](), mouth = P.mouth(), chin = P.chin(), feet = [P['paw:lh'](), P['paw:rh'](), P['hip:l']()];
    j.lfore_1.rotation.x = -.8; j.jaw.rotation.x = .4; j.spine0.rotation.x = .4; j.spine1.rotation.x = .3; a.g.updateMatrixWorld(true);
    assert(P['paw:lf']().distanceTo(hand) > .05, `${name}: the hand swung`);
    assert(P.mouth().distanceTo(mouth) > .05 && P.chin().distanceTo(chin) > .05, `${name}: the mouth and chin moved with the jaw and the stoop`);
    [P['paw:lh'](), P['paw:rh'](), P['hip:l']()].forEach((p, i) => assert(p.distanceTo(feet[i]) < 1e-9, `${name}: the feet and hips stayed`));
    // the right hand rode the stoop (the arms hang from the chest), so compare with the stoop alone
    j.lfore_1.rotation.x = 0; j.jaw.rotation.x = 0; a.g.updateMatrixWorld(true);
    assert(P['paw:rf']().distanceTo(other) > .05, `${name}: a stoop carries the hands`);
    j.spine0.rotation.x = 0; j.spine1.rotation.x = 0; a.g.updateMatrixWorld(true);
    assert(P['paw:rf']().distanceTo(other) < 1e-9 && P.mouth().distanceTo(mouth) < 1e-9, `${name}: back at rest, back where they were`);
  }
});

test('a goal written on roles solves: the left claw reaches a point lifted and forward, and the mouth one the neck can bow it to, under 2 cm', () => {
  for (const f of FAMILY) {
    const a = make(f), j = a.joints, P = rolesOf(a), keys = ['x', 'y', 'z'];
    const run = (names, role, euler, pivotJoint) => {
      const apply = pose => { for (const n of names) for (const ax of keys) j[n].rotation[ax] = pose[n]?.[ax] || 0; a.g.updateMatrixWorld(true); };
      const joints = {}; for (const n of names) for (const ax of keys) joints[`${n}.${ax}`] = [-1.4, 1.4];
      const pivot = new THREE.Vector3().setFromMatrixPosition(pivotJoint.matrixWorld), target = P[role]().sub(pivot).applyEuler(euler).add(pivot);
      solvePose({joints, goals: [goal.reach(role, target, {within: 0})], apply, points: P, rest: 0, iterations: 300});
      const cm = P[role]().distanceTo(target) * 100; assert(cm < 2, `${f[0]}: ${role} ${cm.toFixed(2)} cm from the point`);
      apply({});
    };
    // (the left arm: the right holds the staff, which stays planted)
    run(['lfore_0', 'lfore_1', 'lfore_2'], 'paw:lf', new THREE.Euler(-.7, 0, -.2), j.lfore_0);
    run(['neck1', 'neck2'], 'mouth', new THREE.Euler(.4, -.3, 0), j.neck1);
  }
});
