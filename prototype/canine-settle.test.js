import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateCanineSettle, restFor} from './canine-settle.js';
import {updateCanineBow} from './canine-bowing.js';
import {REST_POSES} from './canine-rest-poses.js';
import {restPose} from './canine-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY = ['jackal', 'werejackal', 'coyote', 'fox', 'wolf', 'warg', 'little dog', 'dog', 'large dog', 'dingo', 'werewolf', 'winter wolf cub', 'winter wolf', 'hell hound pup', 'hell hound'];
const make = name => { const a = createCreature({name, symbol: 100, color: 11}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray()]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateCanineSettle(a, .05, busy, look); return p; };

test('every canine but Cerberus has a baked curl that met every goal, so none is solved mid-play', () => {
  for (const name of FAMILY) { assert(REST_POSES[name]?.ok, `${name} is baked and ok (node tools/bake-canine-rest.mjs): worst ${REST_POSES[name]?.worst}`); assert(restFor(make(name)), name); }
  assert.equal(restFor(make('cerberus')), null);
});

test('the baked jackal and dog curls still match a fresh solve (re-bake after changing a canine\'s body or the curl goals)', () => {
  for (const name of ['jackal', 'dog']) {
    const fresh = restPose(make(name)).pose, baked = REST_POSES[name].pose;
    assert(Math.abs(fresh.hipsY - baked.hipsY) < 2e-3, `${name} hipsY`);
    for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${name} ${n}.${ax}: baked ${baked[n]?.[ax]}, fresh ${v}`);
  }
});

test('left alone it curls up after the wait, belly down, and not before', () => {
  for (const name of ['jackal', 'dog', 'wolf', 'hell hound']) {
    const a = make(name), built = snap(a), P = rolesOf(a), hip0 = P['hip:l']().y;
    assert.equal(run(a, SETTLE - .5), 0, name); assert.equal(snap(a), built, `${name}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, name); a.g.updateMatrixWorld(true);
    assert(a.body.position.y < a.jointRest.body.y - 1e-3, `${name}: body lowered`);
    assert(P['hip:l']().y < hip0 - .05 * a.g.scale.x, `${name}: the haunch came down`);
  }
});

test('never while moving, acting, bowing or dead: the wait starts over', () => {
  const a = make('dog'); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const b = make('dog'); b.canineBow = {phase: 'hold'};
  assert.equal(run(b, SETTLE + SETTLING + 1), 0, 'not while bowing');
  const c = make('dog'); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead');
});

test('a hero close by keeps it up; a far one does not', () => {
  const a = make('wolf'), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('rising, also mid-settle, returns every joint and the body exactly to the awake values', () => {
  for (const name of ['jackal', 'dog', 'hell hound']) {
    const a = make(name), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built);
    assert.equal(run(a, RISE + 1, true), 0, name); assert.equal(snap(a), built, `${name}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateCanineSettle(a, 0, false); assert(mid > 0 && mid < 1, name);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${name}: back exactly from mid-settle`);
  }
});

test('the bow and the curl do not fight: a settled dog the hero walks up to rises and then bows, ending exactly standing', () => {
  const a = make('dog'), built = snap(a), p = a.g.position, near = {x: p.x + 1.2, z: p.z};
  run(a, SETTLE + SETTLING + 1);
  let t = 0;
  for (let i = 0; i < 6 * 30; i++, t += 1 / 30) { updateCanineBow(a, 1 / 30, t, false, near); updateCanineSettle(a, 1 / 30, false, near); }
  assert.equal(a.canineRest.p, 0, 'up');
  for (let i = 0; i < 4 * 30; i++, t += 1 / 30) { updateCanineBow(a, 1 / 30, t, true, near); updateCanineSettle(a, 1 / 30, true, near); }
  assert.equal(snap(a), built);
});

test('things that do not curl up are left alone', () => {
  const a = createCreature({name: 'giant ant', symbol: 100, color: 3});
  assert.equal(updateCanineSettle(a, 1, false), 0); assert.equal(a.canineRest, undefined);
  const c = make('cerberus'); assert.equal(updateCanineSettle(c, 1, false), 0); assert.equal(c.canineRest, undefined);
});
