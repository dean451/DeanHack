import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateImpSettle, restFor} from './imp-settle.js';
import {REST_POSES} from './imp-rest-poses.js';
import {restPose} from './imp-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY = [['imp', 1], ['uranium imp', 2], ['homunculus', 2], ['quasit', 9], ['tengu', 6]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 105, color}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray()]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateImpSettle(a, .05, busy, look); return p; };

test('every imp has a baked squat that met every goal, so none is solved mid-play', () => {
  for (const f of FAMILY) { assert(REST_POSES[f[0]]?.ok, `${f[0]} is baked and ok (node tools/bake-imp-rest.mjs)`); assert(restFor(make(f)), f[0]); }
  assert.equal(restFor(make(['lemure', 3])), null);
});

test('the baked imp and tengu squats still match a fresh solve (re-bake after changing a body or the goals)', () => {
  for (const f of [FAMILY[0], FAMILY[4]]) {
    const fresh = restPose(make(f)).pose, baked = REST_POSES[f[0]].pose;
    assert(Math.abs(fresh.hipsY - baked.hipsY) < 2e-3, `${f[0]} hipsY`);
    for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${f[0]} ${n}.${ax}`);
  }
});

test('left alone it squats after the wait, hips down, and not before', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a), P = rolesOf(a), rump0 = P.rump().y;
    assert.equal(run(a, SETTLE - .5), 0, f[0]); assert.equal(snap(a), built, `${f[0]}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, f[0]); a.g.updateMatrixWorld(true);
    assert(P.rump().y < rump0 - .05 * a.g.scale.x, `${f[0]}: the rump came down`);
  }
});

test('never while moving, acting or dead: the wait starts over', () => {
  const a = make(FAMILY[0]); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const c = make(FAMILY[0]); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead');
  assert.equal(updateImpSettle(make(['lemure', 3]), 1, false), 0, 'the lemure keeps its own slump');
});

test('a hero close by keeps it up; a far one does not', () => {
  const a = make(FAMILY[2]), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('rising, also mid-settle, returns every joint and the body exactly to the awake values', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built, f[0]);
    assert.equal(run(a, RISE + 1, true), 0, f[0]); assert.equal(snap(a), built, `${f[0]}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateImpSettle(a, 0, false); assert(mid > 0 && mid < 1, f[0]);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${f[0]}: back exactly from mid-settle`);
  }
});
