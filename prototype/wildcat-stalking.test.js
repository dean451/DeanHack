import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeline} from './feline.js';
import {updateWildcatStalk, stalkFor, STALKING} from './wildcat-stalking.js';
import {updateWildcatSettle} from './wildcat-settle.js';
import {SETTLE, SETTLING} from './insect-settle.js';
import {STALK_POSES} from './wildcat-stalk-poses.js';
import {stalkPose} from './wildcat-stalk.js';
import {rolesOf} from './body-roles.js';

const FAMILY = ['jaguar', 'lynx', 'panther', 'tiger', 'displacer beast'];
const make = name => { const a = createFeline(name); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray(), a.g.rotation.y]);
const at = (a, d) => ({x: a.g.position.x + d, z: a.g.position.z});
let clock = 0;
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateWildcatStalk(a, .05, clock += .05, busy, look); return p; };

test('every wild cat has a baked crouch that met every goal, so none is solved mid-play', () => {
  for (const name of FAMILY) { assert(STALK_POSES[name]?.ok, `${name} baked and ok (node tools/bake-wildcat-stalk.mjs)`); assert(stalkFor(make(name)), name); }
  assert.equal(stalkFor(make('housecat')), null);
});

test('the baked lynx crouch still matches a fresh solve (re-bake after changing a wild cat\'s body or the crouch goals)', () => {
  const fresh = stalkPose(make('lynx')).pose, baked = STALK_POSES.lynx.pose;
  assert(Math.abs(fresh.hipsY - baked.hipsY) < 2e-3, 'hipsY');
  for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${n}.${ax}`);
});

test('a hero in view at range sets the crouch off: low, and facing them; not before the lull, not out of range', () => {
  for (const name of FAMILY) {
    const a = make(name), P = rolesOf(a), hip0 = P['hip:l']().y, built = snap(a);
    assert.equal(run(a, 3, false, at(a, STALKING.NEAR + 3)), 0, `${name}: too far`); assert.equal(snap(a), built);
    run(a, .5, true, at(a, 4)); assert.equal(run(a, STALKING.LULL - .3, false, at(a, 4)), 0, `${name}: not before the lull (it had just stopped)`);
    assert.equal(run(a, STALKING.DOWN + 1, false, at(a, 4)), 1, name); a.g.updateMatrixWorld(true);
    assert(a.body.position.y < a.jointRest.body.y - 1e-3, `${name}: body lowered`);
    assert(P['hip:l']().y < hip0 - .05 * a.g.scale.x, `${name}: haunch down`);
    assert(Math.abs(Math.atan2(Math.sin(a.g.rotation.y - Math.PI / 2), Math.cos(a.g.rotation.y - Math.PI / 2))) < .1, `${name}: faces the hero`);
  }
});

test('the tail tip twitches while it waits', () => {
  const a = make('tiger'); run(a, STALKING.DOWN + 1, false, at(a, 4));
  const ys = []; for (let i = 0; i < 60; i++) { updateWildcatStalk(a, .05, clock += .05, false, at(a, 4)); ys.push(a.joints.tail2.rotation.y); }
  assert(Math.max(...ys) - Math.min(...ys) > .1, 'the tail flicks');
});

test('it rises when the hero leaves or comes right up, and never crouches with no hero in view, while busy or dead', () => {
  for (const [d, why] of [[STALKING.FAR + 1, 'left'], [STALKING.CLOSE - .5, 'came close']]) {
    const a = make('panther'), built = snap(a); run(a, STALKING.DOWN + 1, false, at(a, 4));
    assert.equal(run(a, STALKING.UP + .3, false, at(a, d)), 0, why); assert.deepEqual(JSON.parse(snap(a)).slice(0, 2), JSON.parse(built).slice(0, 2), `${why}: back exactly`);
  }
  const b = make('jaguar'); assert.equal(run(b, 3, false, null), 0, 'no hero in view');
  assert.equal(run(b, 3, true, at(b, 4)), 0, 'busy');
  const c = make('jaguar'); c.actions = {dead: true}; assert.equal(run(c, 3, false, at(c, 4)), 0, 'dead');
});

test('walking breaks it off at once, and every joint and the body return exactly (also mid-crouch)', () => {
  for (const name of FAMILY) {
    const a = make(name), built = snap(a);
    run(a, STALKING.LULL + STALKING.DOWN / 2 + .1, false, at(a, 4)); const mid = updateWildcatStalk(a, 0, clock, false, at(a, 4)); assert(mid > 0 && mid < 1, name);
    assert.equal(run(a, STALKING.BREAK + .1, true, at(a, 4)), 0, name);
    assert.deepEqual(JSON.parse(snap(a)).slice(0, 2), JSON.parse(built).slice(0, 2), `${name}: back exactly`);
  }
});

test('a cat lying down does not stalk, and a crouching one does not lie down', () => {
  const a = make('tiger'), look = at(a, 12);
  for (let i = 0; i < (SETTLE + SETTLING + 1) * 20; i++) updateWildcatSettle(a, .05, false, look);
  assert(a.wildcatRest.p > 0);
  assert.equal(run(a, 3, false, at(a, 4)), 0, 'lying: no stalk');
  const b = make('tiger'); run(b, STALKING.DOWN + 1, false, at(b, 4));
  for (let i = 0; i < (SETTLE + SETTLING + 1) * 20; i++) { updateWildcatStalk(b, .05, clock += .05, false, at(b, 4)); updateWildcatSettle(b, .05, false, at(b, 7)); }
  assert.equal(b.wildcatRest?.p || 0, 0, 'crouched: no lying down');
});

test('the pet cat and other creatures are left alone', () => {
  const a = {quirk: 'feline', joints: {}, g: {position: {x: 0, z: 0}}};
  assert.equal(updateWildcatStalk(a, 1, 0, false, {x: 4, z: 0}), 0); assert.equal(a.wildcatStalk, undefined);
  assert.equal(updateWildcatStalk(null, 1, 0, false), 0);
});
