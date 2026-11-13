import test from 'node:test';
import assert from 'node:assert/strict';
import {GNOMES, createGnome} from './gnome.js';
import {createGoblin} from './goblin.js';
import {SETTLE, NEAR} from './insect-settle.js';
import {updateGnomeSettle} from './gnome-settle.js';
import {updateGnomeTug} from './gnome-tug.js';
import {waddleFor, waddleMotion, LEN, ALERT, AGAIN, OUT, HELD} from './gnome-waddling.js';
import {WADDLE_POSES} from './gnome-waddle-poses.js';
import {waddlePose} from './gnome-waddle.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for gnomes (family G), step 2: the hero coming near sets the waddle off in play.
const FAMILY = GNOMES.map(n => [n, () => createGnome(n)]);
const make = ([name, build]) => { const a = build(); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray(), a.body.rotation.toArray().slice(0, 3), a.hat.rotation.toArray().slice(0, 3), a.arms.map(o => o.rotation.toArray().slice(0, 3))]);
const NEARBY = {x: 2, z: 1}, FARAWAY = {x: 9, z: 0};
const run = (a, secs, busy = false, look = null) => { let w = 0; for (let i = 0; i < Math.round(secs * 20); i++) { updateGnomeSettle(a, .05, busy, look); w = a.gnomeWaddle.w; } return w; };

test('every gnome has a baked stride that met every goal; a goblin has none', () => {
  for (const f of FAMILY) { assert(WADDLE_POSES[f[0]]?.ok, `${f[0]} is baked and ok (node tools/bake-gnome-waddle.mjs)`); assert(waddleFor(make(f)), f[0]); }
  assert.equal(waddleFor(make(['goblin', () => createGoblin('goblin')])), null);
});

test('the baked strides still match a fresh solve (re-bake after changing a gnome or the goals)', () => {
  for (const f of FAMILY) {
    const fresh = waddlePose(make(f)).pose, baked = WADDLE_POSES[f[0]].pose;
    assert(Math.abs(fresh.hipsY - (baked.hipsY || 0)) < 2e-3, `${f[0]} hipsY`);
    for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${f[0]} ${n}.${ax}`);
  }
});

test('the motion: zero at both ends, flung out fast, held, crept back slowly', () => {
  assert.deepEqual(waddleMotion(0), {w: 0, shiver: 0}); assert.deepEqual(waddleMotion(1), {w: 0, shiver: 0});
  assert(waddleMotion(OUT).w === 1 && waddleMotion((OUT + HELD) / 2).w === 1, 'held at full stride');
  assert(OUT * LEN < .25, 'the lurch out is sudden');
  assert((1 - HELD) * LEN > 3 * OUT * LEN, 'the creep back is much slower than the lurch');
  for (let u = 0; u <= 1; u += .01) { const m = waddleMotion(u); assert(m.w >= 0 && m.w <= 1 && Math.abs(m.shiver) <= 1); }
  assert(Math.abs(waddleMotion(HELD - 1e-9).shiver) < 1e-6, 'the shiver dies out before the creep');
});

test('a far hero or nobody sets nothing off; a near one sets the stride off after ALERT, left boot flung ahead', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    assert.equal(run(a, 5, false, FARAWAY), 0); assert.equal(run(a, 2, false, null), 0);
    assert.equal(snap(a), built, `${f[0]}: untouched with nobody near`);
    const P = rolesOf(a), lead = P['paw:lh']().z - P.rump().z, swing = a.body.rotation.y;
    assert.equal(run(a, ALERT - .1, false, NEARBY), 0, `${f[0]}: waits ALERT`);
    run(a, .1 + OUT * LEN + .3, false, NEARBY); a.g.updateMatrixWorld(true);
    assert.equal(a.gnomeWaddle.w, 1, `${f[0]}: in the stride`);
    assert(P['paw:lh']().z - P.rump().z > lead + .1 * a.g.scale.x, `${f[0]}: left boot flung ahead`);
    assert(a.body.rotation.y - swing > .15, `${f[0]}: pelvis swung round`);
  }
});

test('it ends exactly standing, and goes again AGAIN seconds after while the hero stays', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    run(a, ALERT + LEN + .2, false, NEARBY);
    assert.equal(a.gnomeWaddle.u, null); assert.equal(snap(a), built, `${f[0]}: back exactly`);
    assert.equal(run(a, AGAIN - .5, false, NEARBY), 0, `${f[0]}: not again too soon`);
    let peak = 0; for (let i = 0; i < 40; i++) peak = Math.max(peak, run(a, .05, false, NEARBY));
    assert(peak > .9, `${f[0]}: again after AGAIN`);
  }
});

test('never while walking, acting or dead; breaking off drops it and returns everything exactly', () => {
  const f = FAMILY[0];
  for (const kill of ['busy', 'dead']) {
    const a = make(f), built = snap(a);
    if (kill === 'dead') a.actions = {dead: true};
    assert.equal(run(a, 5, kill === 'busy', NEARBY), 0, kill); assert.equal(snap(a), built, kill);
  }
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    run(a, ALERT + .9, false, NEARBY); assert(a.gnomeWaddle.w > .5, f[0]);
    run(a, .5, true, NEARBY);
    assert.equal(a.gnomeWaddle.u, null); assert.equal(snap(a), built, `${f[0]}: broken off, back exactly`);
  }
});

test('a sitting gnome gets up first, then waddles; it all ends exactly standing', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    run(a, SETTLE + 4, false, null); assert.equal(a.gnomeRest.p, 1, `${f[0]}: sat`);
    let both = false;
    for (let i = 0; i < 40; i++) { run(a, .05, false, NEARBY); if (a.gnomeRest.p > 0 && a.gnomeWaddle.w > 0) both = true; }
    assert(!both, `${f[0]}: never waddles while still getting up`);
    assert.equal(a.gnomeRest.p, 0); assert(a.gnomeWaddle.u != null, `${f[0]}: waddles once up`);
    run(a, LEN + .2, false, FARAWAY);
    assert.equal(snap(a), built, `${f[0]}: standing exactly`);
  }
});

test('with the cap-tug: 40 s of tugging, waddling and sitting end matching a tug-only control exactly', () => {
  for (const f of FAMILY) {
    const a = make(f), c = make(f);
    let sat = false, waddled = false;
    for (let i = 0; i < 800; i++) {
      const look = i < 300 ? null : i < 600 ? NEARBY : FARAWAY, busy = i > 760;
      updateGnomeTug(a, .05, i * .05, busy); updateGnomeSettle(a, .05, busy, look);
      updateGnomeTug(c, .05, i * .05, busy);
      sat ||= a.gnomeRest.p === 1; waddled ||= a.gnomeWaddle.w === 1;
    }
    assert(sat && waddled, `${f[0]}: it sat and waddled`);
    assert.equal(snap(a), snap(c), f[0]);
  }
});

test('the hero is "near" on the settle\'s own range', () => { assert(Math.hypot(NEARBY.x, NEARBY.z) < NEAR && FARAWAY.x > NEAR); });
