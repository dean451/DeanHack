import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateLichSettle, restFor} from './lich-settle.js';
import {updateHumanoidSettle} from './humanoid-settle.js';
import {updateGnomeSettle} from './gnome-settle.js';
import {updateKopSettle} from './kop-settle.js';
import {updateLichChill} from './lich-chill.js';
import {REST_POSES} from './lich-rest-poses.js';
import {restPose, REST} from './lich-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the liches (family L), step 1: stooping over the staff in play.
const FAMILY = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 76, color}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray()]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateLichSettle(a, .05, busy, look); return p; };
// the trunk's lean forward from upright, rump to withers (rad)
const lean = a => { a.g.updateMatrixWorld(true); const P = rolesOf(a), d = P.withers().sub(P.rump()); return Math.atan2(d.z, d.y); };

test('every lich has a baked stoop that met every goal, so none is solved mid-play; a goblin is not one', () => {
  for (const f of FAMILY) { assert(REST_POSES[f[0]]?.ok, `${f[0]} is baked and ok (node tools/bake-lich-rest.mjs)`); assert(restFor(make(f)), f[0]); }
  const g = createGoblin('goblin'); g.species = 'goblin';
  assert.equal(restFor(g), null); assert.equal(updateLichSettle(g, .05, false), 0);
});

test('the baked stoops still match a fresh solve (re-bake after changing a lich or the goals)', () => {
  for (const f of FAMILY) {
    const fresh = restPose(make(f)).pose, baked = REST_POSES[f[0]].pose;
    for (const [j, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[j]?.[ax] ?? 0)) < 2e-3, `${f[0]} ${j}.${ax}`);
  }
});

test('left alone it stoops over its staff after the wait, and not before; no other settle takes it', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a), up = lean(a);
    assert.equal(run(a, SETTLE - .5), 0, f[0]); assert.equal(snap(a), built, `${f[0]}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, f[0]);
    assert(Math.abs(lean(a) - up - REST.stoop) < .05, `${f[0]}: bowed by the stoop (${(lean(a) - up).toFixed(3)} rad)`);
    const b = make(f), still = snap(b);
    for (let i = 0; i < 400; i++) { assert.equal(updateHumanoidSettle(b, .05, false), 0); assert.equal(updateGnomeSettle(b, .05, false), 0); assert.equal(updateKopSettle(b, .05, false), 0); }
    assert.equal(snap(b), still, `${f[0]}: no second rest from another settle`);
  }
});

test('never while moving, acting or dead: the wait starts over', () => {
  const a = make(FAMILY[0]); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const c = make(FAMILY[0]), built = snap(c); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead'); assert.equal(snap(c), built);
});

test('a hero close by keeps it upright; a far one does not', () => {
  const a = make(FAMILY[0]), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('straightening, also mid-settle, returns every joint and the body exactly to the awake values', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built, f[0]);
    assert.equal(run(a, RISE + 1, true), 0, f[0]); assert.equal(snap(a), built, `${f[0]}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateLichSettle(a, 0, false); assert(mid > 0 && mid < 1, f[0]);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${f[0]}: back exactly from mid-settle`);
  }
});

test('under the cold\'s grasps (lich-chill.js) the free arm hangs in the stoop, and straightening leaves it as the cold alone would', () => {
  const a = make(FAMILY[0]), b = make(FAMILY[0]);
  updateLichChill(a, 0, 0, false); updateLichChill(b, 0, 0, false);
  // the same grasp clock on both, so b is a chill-only control
  for (const k of ['seed', 'wait', 'ph']) b.lichChill[k] = a.lichChill[k];
  const arm = o => o.lichChill.free.arm.rotation.x, restX = a.lichChill.free.restX;
  let t = 0, lifted = 0, grasped = 0;
  const step = (secs, busy) => { for (let i = 0; i < Math.round(secs * 20); i++) { t += .05; updateLichChill(a, .05, t, busy); updateLichChill(b, .05, t, busy); const p = updateLichSettle(a, .05, busy); if (p === 1 && arm(b) < restX - .1) grasped++, lifted = Math.max(lifted, Math.abs(arm(a) - restX)); } };
  step(SETTLE + SETTLING + 20, false);
  assert(grasped > 0, 'a grasp came while it stooped'); assert(lifted < 1e-9, `a grasp did not lift the arm out of the stoop (${lifted})`);
  step(RISE + 1, true);
  assert.equal(snap(a), snap(b), 'straightened, every joint as the chill-only control');
});
