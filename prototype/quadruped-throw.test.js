import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateQuadrupedThrow, throwPose, throwFor, throws, FAMILY, NEAR, ALERT, GAP, LEN} from './quadruped-throw.js';
import {CHARGE_POSES} from './quadruped-charge-poses.js';
import {chargePose} from './quadruped-charge.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Stage 4 of the creature plan for the heavy quadrupeds (family q), step 3: the thrown head, set off by the hero.
const make = name => { const a = createCreature({name, symbol: 113, color: 7}); a.g.updateMatrixWorld(true); return a; };
const snap = a => Object.fromEntries(Object.entries(a.joints).map(([k, o]) => [k, o.rotation.toArray().slice(0, 3)]));
const hero = (a, d) => ({x: a.g.position.x + d, z: a.g.position.z});
const run = (a, secs, busy, look, dt = 1 / 30) => { let peak = 0; for (let t = 0; t < secs; t += dt) peak = Math.max(peak, Math.abs(updateQuadrupedThrow(a, dt, busy, look))); return peak; };

test('every member has a baked throw that met its goals; nothing else throws', () => {
  for (const n of FAMILY) { assert(CHARGE_POSES[n]?.ok, n); assert(throws(make(n)), n); assert(throwFor(make(n)).neck0.x !== 0, n); }
  assert(!throws(null) && !throws(make('newt')));
});

test('the baked throws match a fresh solve', () => {
  for (const n of FAMILY) { const r = chargePose(make(n)); assert(Math.abs(r.pose.neck0.x - CHARGE_POSES[n].pose.neck0.x) < 2e-3, n); }
});

test('throwPose is zero at both ends, reaches the full throw, stays in bounds', () => {
  assert.equal(throwPose(0), 0); assert.equal(throwPose(1), 0); assert.equal(throwPose(-1), 0); assert.equal(throwPose(NaN), 0);
  let peak = 0; for (let u = 0; u <= 1; u += .005) { const p = throwPose(u); assert(p >= 0 && p <= 1, `u ${u}`); peak = Math.max(peak, p); }
  assert(peak > .95);
  assert(throwPose(.12) > .9 && throwPose(.9) < .2, 'snaps up quickly, settles back slowly');
});

test('a far hero or no hero leaves the head alone', () => {
  for (const n of FAMILY) { const a = make(n), built = snap(a); assert.equal(run(a, 20, false, hero(a, NEAR + 3)), 0, n); assert.equal(run(a, 20, false, null), 0, n); assert.deepEqual(snap(a), built, n); }
});

test('a near hero sets the throw off within a second, and again every GAP', () => {
  for (const n of FAMILY) {
    const a = make(n), built = snap(a), look = hero(a, 2), dir = Math.sign(CHARGE_POSES[n].pose.neck0.x);
    assert.equal(run(a, ALERT - .1, false, look), 0, `${n}: not before ALERT`);
    let peak = 0, moved = 0; for (let t = 0; t < ALERT + 1; t += 1 / 30) { peak = Math.max(peak, updateQuadrupedThrow(a, 1 / 30, false, look)); moved = Math.max(moved, (a.joints.neck0.rotation.x - built.neck0[0]) * dir); }
    assert(peak > 0 && moved > .3, `${n}: thrown within a second (${moved.toFixed(2)})`);
    run(a, LEN, false, look); assert(run(a, GAP + 1, false, look) > .9, `${n}: throws again`);
  }
});

test('a throw never starts while walking, acting, dead or lying; each one cuts a throw short and returns every joint exactly', () => {
  for (const n of FAMILY) {
    const a = make(n), built = snap(a), look = hero(a, 2);
    assert.equal(run(a, 5, true, look), 0, `${n}: not while busy`);
    a.actions = {dead: true}; assert.equal(run(a, 5, false, look), 0, `${n}: not dead`); a.actions = null;
    a.quadrupedRest = {p: .5}; assert.equal(run(a, 5, false, look), 0, `${n}: not lying`); a.quadrupedRest = null;
    assert.deepEqual(snap(a), built, n);
    run(a, ALERT + .5, false, look); assert.notDeepEqual(snap(a), built, `${n}: mid-throw`);
    run(a, 2, true, look); assert.deepEqual(snap(a), built, `${n}: busy cuts it short`);
    for (let i = 0; i < 400; i++) updateQuadrupedThrow(a, 1 / 30, true, look);
    for (let i = 0; i < 20000; i++) updateQuadrupedThrow(a, 1 / 30, false, look);
    run(a, 6, true, null); assert.deepEqual(snap(a), built, `${n}: exact after many throws`);
  }
});

test('the thrown head lifts the mouth and leaves the four feet where they stood', () => {
  for (const n of FAMILY) {
    const a = make(n), floor = a.g.position.y, P0 = rolesOf(a), feet = ['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh'].map(p => P0[p]().clone()), stand = P0.mouth().y - floor, look = hero(a, 2);
    let best = 0; for (let t = 0; t < 3; t += 1 / 30) { updateQuadrupedThrow(a, 1 / 30, false, look); a.g.updateMatrixWorld(true); best = Math.max(best, Math.abs(rolesOf(a).mouth().y - floor - stand)); }
    assert(best > .1 * stand, `${n}: mouth moved ${best.toFixed(2)} of ${stand.toFixed(2)}`);
    ['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh'].forEach((p, i) => assert(rolesOf(a)[p]().distanceTo(feet[i]) < .01 * a.g.scale.x + .005, `${n}: ${p}`));
  }
});
