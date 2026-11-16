import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {MUMMIES} from './mummy.js';
import {SETTLE, NEAR} from './insect-settle.js';
import {updateMummySettle} from './mummy-settle.js';
import {updateMummyGrope} from './mummy-grope.js';
import {updateMummyCreak} from './mummy-creak.js';
import {lurchFor, lurchMotion, LEN, ALERT, AGAIN, JERK, CAUGHT, GIVE, OUT, HELD, FACE} from './mummy-lurching.js';
import {LURCH_POSES} from './mummy-lurch-poses.js';
import {lurchPose} from './mummy-lurch.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the mummies (family M), step 2: the hero coming near sets the lurch off in play.
const NAMES = Object.keys(MUMMIES);
const make = name => { const a = createCreature({name, symbol: 77, color: 7}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const rot = o => o.rotation.toArray().slice(0, 3);
const snap = a => JSON.stringify([Object.values(a.joints).map(rot), a.body.position.toArray(), rot(a.body), (a.heads || [a.head]).map(rot), a.arms.map(rot)]);
const NEARBY = {x: 2, z: 1}, FARAWAY = {x: 9, z: 0};
const run = (a, secs, busy = false, look = null) => { let w = 0; for (let i = 0; i < Math.round(secs * 20); i++) { updateMummySettle(a, .05, busy, look); w = a.mummyLurch.w; } return w; };
// where a part lies in the mummy's own frame (the actor's group, so the body's swing toward the hero shows)
const local = (a, p) => a.g.worldToLocal(p.clone());

test('every mummy has a baked lurch that met every goal, so none is solved mid-play; a goblin has none', () => {
  for (const name of NAMES) { assert(LURCH_POSES[name]?.ok, `${name} is baked and ok (node tools/bake-mummy-lurch.mjs)`); assert(lurchFor(make(name)), name); }
  const g = createGoblin('goblin'); g.species = 'goblin';
  assert.equal(lurchFor(g), null);
});

test('the baked lurches still match a fresh solve (re-bake after changing a mummy or the goals)', () => {
  for (const name of ['human mummy', 'ettin mummy']) {
    const fresh = lurchPose(make(name)).pose, baked = LURCH_POSES[name].pose;
    assert(Math.abs((fresh.hipsY || 0) - (baked.hipsY || 0)) < 2e-3, `${name} hipsY`);
    for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${name} ${n}.${ax}`);
  }
});

test('the motion: zero at both ends, a jerk out that catches, the lunge, the hold, a slow drag back', () => {
  assert.equal(lurchMotion(0), 0); assert.equal(lurchMotion(1), 0);
  assert(Math.abs(lurchMotion((JERK + GIVE) / 2) - CAUGHT) < 1e-9, 'caught halfway out');
  assert(lurchMotion(OUT) === 1 && lurchMotion((OUT + HELD) / 2) === 1, 'held at full reach');
  assert((GIVE - JERK) * LEN > .3, 'the catch is a beat you can see');
  assert(JERK * LEN < .2 && (OUT - GIVE) * LEN < .25, 'both jerks are sudden');
  assert((1 - HELD) * LEN > 4 * (OUT - GIVE) * LEN, 'the drag back is much slower than the lunge');
  for (let u = 0; u <= 1; u += .01) { const w = lurchMotion(u); assert(w >= 0 && w <= 1); }
});

test('a far hero or nobody sets nothing off; a near one sets it off after ALERT: leg out, arms up, turned to him', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a);
    assert.equal(run(a, 5, false, FARAWAY), 0); assert.equal(run(a, 2, false, null), 0);
    assert.equal(snap(a), built, `${name}: untouched with nobody near`);
    const P = rolesOf(a), s = a.g.scale.x, lead = local(a, P['paw:lh']()).z - local(a, P.rump()).z;
    const hand = Math.max(P['paw:lf']().y, P['paw:rf']().y), turn = a.body.rotation.y;
    assert.equal(run(a, ALERT - .1, false, NEARBY), 0, `${name}: waits ALERT`);
    run(a, .1 + JERK * LEN + .1, false, NEARBY);
    assert(Math.abs(a.mummyLurch.w - CAUGHT) < 1e-9, `${name}: caught halfway`);
    run(a, (OUT - JERK) * LEN + .1, false, NEARBY); a.g.updateMatrixWorld(true);
    assert.equal(a.mummyLurch.w, 1, `${name}: in the lurch`);
    assert(local(a, P['paw:lh']()).z - local(a, P.rump()).z > lead + .05 * s, `${name}: stiff leg dragged ahead`);
    assert(Math.max(P['paw:lf']().y, P['paw:rf']().y) > hand + .1 * s, `${name}: arms flung up`);
    const want = Math.min(FACE, Math.atan2(NEARBY.x, NEARBY.z));
    assert(Math.abs(a.body.rotation.y - turn - want) < 1e-9, `${name}: swung round toward the hero`);
  }
});

test('it ends exactly standing, and goes again AGAIN seconds after while the hero stays', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a);
    run(a, ALERT + LEN + .2, false, NEARBY);
    assert.equal(a.mummyLurch.u, null); assert.equal(snap(a), built, `${name}: back exactly`);
    assert.equal(run(a, AGAIN - .5, false, NEARBY), 0, `${name}: not again too soon`);
    let peak = 0; for (let i = 0; i < 60; i++) peak = Math.max(peak, run(a, .05, false, NEARBY));
    assert(peak > .9, `${name}: again after AGAIN`);
  }
});

test('never while walking, acting or dead; breaking off drops it and returns everything exactly', () => {
  for (const kill of ['busy', 'dead']) {
    const a = make('human mummy'), built = snap(a);
    if (kill === 'dead') a.actions = {dead: true};
    assert.equal(run(a, 5, kill === 'busy', NEARBY), 0, kill); assert.equal(snap(a), built, kill);
  }
  for (const name of NAMES) {
    const a = make(name), built = snap(a);
    run(a, ALERT + OUT * LEN + .3, false, NEARBY); assert(a.mummyLurch.w > .9, name);
    run(a, .5, true, NEARBY);
    assert.equal(a.mummyLurch.u, null); assert.equal(snap(a), built, `${name}: broken off, back exactly`);
  }
});

test('a laid-out mummy unfolds first, then lurches; it all ends exactly standing', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a);
    run(a, SETTLE + 4, false, null); assert.equal(a.mummyRest.p, 1, `${name}: laid out`);
    let both = false;
    for (let i = 0; i < 40; i++) { run(a, .05, false, NEARBY); if (a.mummyRest.p > 0 && a.mummyLurch.w > 0) both = true; }
    assert(!both, `${name}: never lurches while still unfolding`);
    assert.equal(a.mummyRest.p, 0); assert(a.mummyLurch.u != null, `${name}: lurches once up`);
    run(a, LEN + .2, false, FARAWAY);
    assert.equal(snap(a), built, `${name}: standing exactly`);
  }
});

test('with the grope and the creak: 40 s of groping, lurching and lying still match a grope-and-creak-only control', () => {
  for (const name of NAMES) {
    const a = make(name), c = make(name);
    // the grope and the creak seed their timing from the actor's id: start both on the same state
    updateMummyGrope(a, 0, 0, false); updateMummyCreak(a, 0, 0, false);
    c.mummyGrope = structuredClone(a.mummyGrope); c.mummyCreak = structuredClone(a.mummyCreak);
    let rested = false, lurched = false;
    for (let i = 0; i < 800; i++) {
      const look = i < 300 ? null : i < 600 ? NEARBY : FARAWAY, busy = i > 760, t = i * .05;
      updateMummyGrope(a, .05, t, busy); updateMummyCreak(a, .05, t, busy); updateMummySettle(a, .05, busy, look);
      updateMummyGrope(c, .05, t, busy); updateMummyCreak(c, .05, t, busy);
      rested ||= a.mummyRest.p === 1; lurched ||= a.mummyLurch.w === 1;
    }
    assert(rested && lurched, `${name}: it lay still and lurched`);
    assert.equal(snap(a), snap(c), name);
  }
});

test('the hero is "near" on the settle\'s own range', () => { assert(Math.hypot(NEARBY.x, NEARBY.z) < NEAR && FARAWAY.x > NEAR); });
