import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createGnome} from './gnome.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateKopSettle, restFor} from './kop-settle.js';
import {updateHumanoidSettle} from './humanoid-settle.js';
import {updateGnomeSettle} from './gnome-settle.js';
import {sweeps} from './guard-sweep.js';
import {REST_POSES} from './kop-rest-poses.js';
import {restPose} from './kop-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the Kops (family K), step 1: standing at ease in play.
const NAMES = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const make = name => { const a = createCreature({name, symbol: 75, color: 4}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray()]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateKopSettle(a, .05, busy, look); return p; };

test('every Kop has a baked stance that met every goal, so none is solved mid-play; a gnome is not one', () => {
  for (const n of NAMES) { assert(REST_POSES[n]?.ok, `${n} is baked and ok (node tools/bake-kop-rest.mjs)`); assert(restFor(make(n)), n); }
  const g = createGnome('gnome'); g.species = 'gnome';
  assert.equal(restFor(g), null); assert.equal(updateKopSettle(g, .05, false), 0);
});

test('the baked stances still match a fresh solve (re-bake after changing a Kop or the goals)', () => {
  for (const n of NAMES) {
    const fresh = restPose(make(n)).pose, baked = REST_POSES[n].pose;
    assert(Math.abs((fresh.hipsY || 0) - (baked.hipsY || 0)) < 2e-3, `${n} hipsY`);
    for (const [j, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[j]?.[ax] ?? 0)) < 2e-3, `${n} ${j}.${ax}`);
  }
});

test('left alone it stands at ease after the wait, boots apart and hands behind, and not before; no other settle takes it', () => {
  for (const n of NAMES) {
    const a = make(n), built = snap(a), P = rolesOf(a), gap0 = P['paw:rh']().x - P['paw:lh']().x, hands0 = (P['paw:lf']().z + P['paw:rf']().z) / 2;
    assert.equal(run(a, SETTLE - .5), 0, n); assert.equal(snap(a), built, `${n}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, n); a.g.updateMatrixWorld(true);
    const s = a.g.scale.x;
    assert(P['paw:rh']().x - P['paw:lh']().x > gap0 + .04 * s, `${n}: the boots parted`);
    assert((P['paw:lf']().z + P['paw:rf']().z) / 2 < hands0 - .05 * s, `${n}: the hands went behind`);
    const b = make(n), still = snap(b);
    for (let i = 0; i < 400; i++) { assert.equal(updateHumanoidSettle(b, .05, false), 0); assert.equal(updateGnomeSettle(b, .05, false), 0); }
    assert.equal(snap(b), still, `${n}: no second rest from humanoid-settle.js or gnome-settle.js`);
  }
});

test('the guards\' head sweep does not run on a Kop, so it cannot leave a turned head behind on one', () => {
  for (const n of NAMES) assert.equal(sweeps(make(n)), false, n);
});

test('never while moving, acting or dead: the wait starts over', () => {
  const a = make(NAMES[0]); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const c = make(NAMES[0]), built = snap(c); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead'); assert.equal(snap(c), built);
});

test('a hero close by keeps it at attention; a far one does not', () => {
  const a = make(NAMES[0]), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('coming to attention, also mid-settle, returns every joint and the body exactly to the awake values', () => {
  for (const n of NAMES) {
    const a = make(n), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built, n);
    assert.equal(run(a, RISE + 1, true), 0, n); assert.equal(snap(a), built, `${n}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateKopSettle(a, 0, false); assert(mid > 0 && mid < 1, n);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${n}: back exactly from mid-settle`);
  }
});
