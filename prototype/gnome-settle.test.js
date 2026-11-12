import test from 'node:test';
import assert from 'node:assert/strict';
import {GNOMES, createGnome} from './gnome.js';
import {createGoblin} from './goblin.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateGnomeSettle, restFor} from './gnome-settle.js';
import {updateHumanoidSettle} from './humanoid-settle.js';
import {updateGnomeTug} from './gnome-tug.js';
import {REST_POSES} from './gnome-rest-poses.js';
import {restPose} from './gnome-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for gnomes (family G), step 1: the slump in play.
const FAMILY = GNOMES.map(n => [n, () => createGnome(n)]);
const make = ([name, build]) => { const a = build(); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray(), a.hat.rotation.toArray().slice(0, 3)]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateGnomeSettle(a, .05, busy, look); return p; };

test('every gnome has a baked sit that met every goal, so none is solved mid-play; a goblin is not one', () => {
  for (const f of FAMILY) { assert(REST_POSES[f[0]]?.ok, `${f[0]} is baked and ok (node tools/bake-gnome-rest.mjs)`); assert(restFor(make(f)), f[0]); }
  assert.equal(restFor(make(['goblin', () => createGoblin('goblin')])), null);
});

test('the baked sits still match a fresh solve (re-bake after changing a gnome or the goals)', () => {
  for (const f of FAMILY) {
    const fresh = restPose(make(f)).pose, baked = REST_POSES[f[0]].pose;
    assert(Math.abs(fresh.hipsY - baked.hipsY) < 2e-3, `${f[0]} hipsY`);
    for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${f[0]} ${n}.${ax}`);
  }
});

test('left alone it sits after the wait, pelvis down and head hung, and not before; the humanoid settle leaves it alone', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a), P = rolesOf(a), rump0 = P.rump().y, mouth0 = P.mouth().y;
    assert.equal(run(a, SETTLE - .5), 0, f[0]); assert.equal(snap(a), built, `${f[0]}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, f[0]); a.g.updateMatrixWorld(true);
    assert(P.rump().y < rump0 - .05 * a.g.scale.x, `${f[0]}: the rump came down`);
    assert(P.mouth().y < mouth0 - .05 * a.g.scale.x, `${f[0]}: the head came down`);
    const b = make(f), still = snap(b);
    for (let i = 0; i < 400; i++) assert.equal(updateHumanoidSettle(b, .05, false), 0);
    assert.equal(snap(b), still, `${f[0]}: no second sit from humanoid-settle.js`);
  }
});

test('never while moving, acting or dead: the wait starts over', () => {
  const a = make(FAMILY[0]); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const c = make(FAMILY[0]), built = snap(c); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead'); assert.equal(snap(c), built);
});

test('a hero close by keeps it up; a far one does not', () => {
  const a = make(FAMILY[0]), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('rising, also mid-settle, returns every joint and the body exactly to the awake values', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built, f[0]);
    assert.equal(run(a, RISE + 1, true), 0, f[0]); assert.equal(snap(a), built, `${f[0]}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateGnomeSettle(a, 0, false); assert(mid > 0 && mid < 1, f[0]);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${f[0]}: back exactly from mid-settle`);
  }
});

// The game's frame order: gnome-tug.js's cap-tug first, gnome-settle.js last. `settle` false is the control: the same
// tugs with no sit, so any difference once it is up is the sit leaving something behind on a joint the tug moved.
test('a sitting gnome that tugs its cap and then gets up leaves nothing behind', () => {
  const frames = (a, secs, busy, state, settle = true) => {
    let tugged = 0;
    for (let i = 0; i < Math.round(secs * 20); i++) { state.t += .05; if (updateGnomeTug(a, .05, state.t, busy)) tugged++; if (settle) updateGnomeSettle(a, .05, busy); }
    return tugged;
  };
  for (const f of FAMILY) {
    const a = make(f), c = make(f);
    // (the tug seeds from the mesh id; give both the same, so the control tugs at the same times)
    for (const k of [a, c]) k.gnomeTug = {seed: 4242, wait: 0, cur: null, f: 0, applied: {raise: 0, across: 0, yank: 0, skew: 0, duck: 0, glance: 0}};
    const sa = {t: 0}, sc = {t: 0}, secs = SETTLE + SETTLING + 40;
    const tugged = frames(a, secs, false, sa); frames(c, secs, false, sc, false);
    assert.equal(a.gnomeRest.p, 1, `${f[0]}: it sat`); assert(tugged > 0, `${f[0]}: it tugged its cap while sitting`);
    frames(a, RISE + 1, true, sa); frames(c, RISE + 1, true, sc, false);
    assert.equal(a.gnomeRest.p, 0, `${f[0]}: up`);
    assert.equal(snap(a), snap(c), `${f[0]}: every joint, the body and the cap where the tug-only control has them`);
  }
});
