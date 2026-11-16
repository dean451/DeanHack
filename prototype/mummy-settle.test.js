import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {MUMMIES} from './mummy.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateMummySettle, restFor} from './mummy-settle.js';
import {updateHumanoidSettle} from './humanoid-settle.js';
import {updateGnomeSettle} from './gnome-settle.js';
import {updateKopSettle} from './kop-settle.js';
import {updateLichSettle} from './lich-settle.js';
import {updateMummyGrope} from './mummy-grope.js';
import {updateMummyCreak} from './mummy-creak.js';
import {REST_POSES} from './mummy-rest-poses.js';
import {restPose} from './mummy-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the mummies (family M), step 1: the laid-out rest in play.
const NAMES = Object.keys(MUMMIES);
const make = name => { const a = createCreature({name, symbol: 77, color: 7}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray()]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateMummySettle(a, .05, busy, look); return p; };
const angles = a => Object.values(a.joints).flatMap(o => o.rotation.toArray().slice(0, 3));
// how far ahead of the chest the hands reach, in the body's own space (the reaching arms out, the crossed ones in)
const reach = a => { a.g.updateMatrixWorld(true); const P = rolesOf(a); return Math.max(...['l', 'r'].map(s => a.body.worldToLocal(P[`paw:${s}f`]()).z)); };

test('every mummy has a baked rest that met every goal, so none is solved mid-play; a goblin is not one', () => {
  for (const name of NAMES) { assert(REST_POSES[name]?.ok, `${name} is baked and ok (node tools/bake-mummy-rest.mjs)`); assert(restFor(make(name)), name); }
  const g = createGoblin('goblin'); g.species = 'goblin';
  assert.equal(restFor(g), null); assert.equal(updateMummySettle(g, .05, false), 0);
});

test('the baked rests still match a fresh solve (re-bake after changing a mummy or the goals)', () => {
  for (const name of NAMES) {
    const fresh = restPose(make(name)).pose, baked = REST_POSES[name].pose;
    for (const [j, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[j]?.[ax] ?? 0)) < 2e-3, `${name} ${j}.${ax}`);
  }
});

test('left alone it folds its arms across the chest after the wait, and not before; no other settle takes it', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a), out = reach(a);
    assert.equal(run(a, SETTLE - .5), 0, name); assert.equal(snap(a), built, `${name}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, name);
    assert(reach(a) < out - .1, `${name}: the hands came in off the reach (${out.toFixed(2)} to ${reach(a).toFixed(2)})`);
    const b = make(name), still = snap(b);
    for (let i = 0; i < 400; i++) for (const f of [updateHumanoidSettle, updateGnomeSettle, updateKopSettle, updateLichSettle]) assert.equal(f(b, .05, false), 0, `${name}: ${f.name}`);
    assert.equal(snap(b), still, `${name}: no second rest from another settle`);
  }
});

test('never while moving, acting or dead: the wait starts over', () => {
  const a = make(NAMES[0]); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const c = make(NAMES[0]), built = snap(c); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead'); assert.equal(snap(c), built);
});

test('a hero close by keeps it reaching; a far one does not', () => {
  const a = make('human mummy'), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('waking, also mid-settle, returns every joint and the body exactly to the awake values', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built, name);
    assert.equal(run(a, RISE + 1, true), 0, name); assert.equal(snap(a), built, `${name}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateMummySettle(a, 0, false); assert(mid > 0 && mid < 1, name);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${name}: back exactly from mid-settle`);
  }
});

test('under the grope and the creak the rest holds, and waking leaves every joint as the grope and creak alone would', () => {
  for (const name of ['human mummy', 'ettin mummy']) {
    const a = make(name), b = make(name);
    // the same idle clocks on both, so b is a grope-and-creak-only control
    updateMummyGrope(a, 0, 0, false); updateMummyGrope(b, 0, 0, false); updateMummyCreak(a, 0, 0, false); updateMummyCreak(b, 0, 0, false);
    for (const k of ['seed', 'wait']) { b.mummyGrope[k] = a.mummyGrope[k]; b.mummyCreak[k] = a.mummyCreak[k]; }
    let t = 0, moved = 0, held = 0, groped = 0, rested = null;
    const step = (secs, busy) => { for (let i = 0; i < Math.round(secs * 20); i++) {
      t += .05;
      // the order live-frame.js runs them in: the grope (fidget.js), the creak, then the settle last
      for (const o of [a, b]) { updateMummyGrope(o, .05, t, busy); updateMummyCreak(o, .05, t, busy); }
      const p = updateMummySettle(a, .05, busy);
      if (p === 1) { const s = angles(a); if (rested === null) rested = s; else moved = Math.max(moved, ...s.map((v, k) => Math.abs(v - rested[k]))); held++; if (b.mummyGrope.s != null || b.mummyCreak.cur) groped++; }
    } };
    step(SETTLE + SETTLING + 40, false);
    assert(held > 200, `${name}: it lay still a while`); assert(groped > 20, `${name}: a grope or creak played while it lay at rest (${groped} frames)`);
    assert(moved < 1e-9, `${name}: no grope or creak moved a joint while it lay at rest (${moved})`);
    step(RISE + 1, true);
    assert.equal(snap(a), snap(b), `${name}: woken, every joint as the grope-and-creak-only control`);
  }
});
