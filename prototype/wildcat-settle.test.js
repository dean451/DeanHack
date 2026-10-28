import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeline} from './feline.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateWildcatSettle, restFor} from './wildcat-settle.js';
import {REST_POSES} from './wildcat-rest-poses.js';
import {restPose} from './wildcat-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY = ['jaguar', 'lynx', 'panther', 'tiger', 'displacer beast'];
const make = name => { const a = createFeline(name); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray()]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateWildcatSettle(a, .05, busy, look); return p; };

test('every wild cat has a baked rest that met every goal, so none is solved mid-play', () => {
  for (const name of FAMILY) { assert(REST_POSES[name]?.ok, `${name} is baked and ok (node tools/bake-wildcat-rest.mjs): worst ${REST_POSES[name]?.worst}`); assert(restFor(make(name)), name); }
  assert.equal(restFor(make('housecat')), null);
});

test('the baked lynx rest still matches a fresh solve (re-bake after changing a wild cat\'s body or the rest goals)', () => {
  const fresh = restPose(make('lynx')).pose, baked = REST_POSES.lynx.pose;
  assert(Math.abs(fresh.hipsY - baked.hipsY) < 2e-3, 'hipsY');
  for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${n}.${ax}: baked ${baked[n]?.[ax]}, fresh ${v}`);
});

test('left alone it lies down after the wait, belly down, and not before', () => {
  for (const name of FAMILY) {
    const a = make(name), built = snap(a), P = rolesOf(a), hip0 = P['hip:l']().y;
    assert.equal(run(a, SETTLE - .5), 0, name); assert.equal(snap(a), built, `${name}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, name); a.g.updateMatrixWorld(true);
    assert(a.body.position.y < a.jointRest.body.y - 1e-3, `${name}: body lowered`);
    assert(P['hip:l']().y < hip0 - .05 * a.g.scale.x, `${name}: the haunch came down`);
  }
});

test('never while moving, acting or dead: the wait starts over', () => {
  const a = make('tiger'); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const c = make('tiger'); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead');
});

test('a hero close by keeps it up; a far one does not', () => {
  const a = make('panther'), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('rising, also mid-settle, returns every joint and the body exactly to the awake values', () => {
  for (const name of FAMILY) {
    const a = make(name), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built);
    assert.equal(run(a, RISE + 1, true), 0, name); assert.equal(snap(a), built, `${name}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateWildcatSettle(a, 0, false); assert(mid > 0 && mid < 1, name);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${name}: back exactly from mid-settle`);
  }
});

test('the pet cat and other creatures are left alone', () => {
  const a = {quirk: 'feline', joints: {}, g: {position: {x: 0, z: 0}}};
  assert.equal(updateWildcatSettle(a, 1, false), 0); assert.equal(a.wildcatRest, undefined);
  assert.equal(updateWildcatSettle(null, 1, false), 0);
});
