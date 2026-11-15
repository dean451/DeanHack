import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createGnome} from './gnome.js';
import {SETTLE, NEAR} from './insect-settle.js';
import {updateKopSettle} from './kop-settle.js';
import {haltFor, haltMotion, filmTime, LEN, ALERT, AGAIN, OUT, HELD, FPS} from './kop-halting.js';
import {HALT_POSES} from './kop-halt-poses.js';
import {haltPose} from './kop-halt.js';
import {rolesOf} from './body-roles.js';
import {MEASURES} from './creature-measures.js';

// Stage 5 of the creature plan for the Kops (family K), step 2: the hero coming near sets the halt off in play.
const NAMES = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const make = name => { const a = createCreature({name, symbol: 75, color: 4}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray(), a.body.rotation.toArray().slice(0, 3)]);
const NEARBY = {x: 0, z: 2.5}, FARAWAY = {x: 9, z: 0};
const run = (a, secs, busy = false, look = null) => { let h = 0; for (let i = 0; i < Math.round(secs * 20); i++) { updateKopSettle(a, .05, busy, look); h = a.kopHalt.h; } return h; };

test('every Kop has a baked halt that met every goal; a gnome has none', () => {
  for (const n of NAMES) { assert(HALT_POSES[n]?.ok, `${n} is baked and ok (node tools/bake-kop-halt.mjs)`); assert(haltFor(make(n)), n); }
  const g = createGnome('gnome'); g.species = 'gnome';
  assert.equal(haltFor(g), null);
});

test('the baked halts still match a fresh solve (re-bake after changing a Kop or the goals)', () => {
  for (const n of NAMES) {
    const fresh = haltPose(make(n)).pose, baked = HALT_POSES[n].pose;
    for (const [j, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[j]?.[ax] ?? 0)) < 2e-3, `${n} ${j}.${ax}`);
  }
});

test('the motion: zero at both ends, thrown out fast, held with two shakes, lowered slowly', () => {
  assert.deepEqual(haltMotion(0), {h: 0, shake: 0}); assert.deepEqual(haltMotion(1), {h: 0, shake: 0});
  assert(haltMotion(OUT).h === 1 && haltMotion((OUT + HELD) / 2).h === 1, 'held fully out');
  assert(OUT * LEN < .25, 'the throw is sudden');
  assert((1 - HELD) * LEN > 3 * OUT * LEN, 'the lowering is much slower than the throw');
  let peaks = 0, was = 0;
  for (let u = 0; u <= 1; u += .001) { const m = haltMotion(u); assert(m.h >= 0 && m.h <= 1 && m.shake >= 0 && m.shake <= 1); if (m.shake > .99 && was <= .99) peaks++; was = m.shake; if (u < OUT || u > HELD) assert.equal(m.shake, 0, `no shake at ${u}`); }
  assert.equal(peaks, 2, 'two shakes of the club');
});

test('it moves at the silent comedy\'s cranking rate: the pose holds for a film frame, then jumps', () => {
  assert(FPS >= MEASURES.kop.crankFps[0] && FPS <= MEASURES.kop.crankFps[1]);
  assert.equal(filmTime(0), 0); assert.equal(filmTime(.99 / FPS), 0); assert(Math.abs(filmTime(1 / FPS) - 1 / FPS) < 1e-12);
  const a = make(NAMES[0]);
  run(a, ALERT + .05, false, NEARBY);
  // with the halt under way, steps of a fifth of a film frame keep the arm where it was for most steps
  const seen = [];
  for (let i = 0; i < 60; i++) { updateKopSettle(a, .2 / FPS, false, NEARBY); seen.push(a.joints.lfore_0.rotation.y.toFixed(9) + a.joints.rfore_2.rotation.x.toFixed(9)); }
  const changes = seen.filter((v, i) => i && v !== seen[i - 1]).length;
  assert(changes > 0 && changes <= 13, `the pose jumps once a film frame at most (${changes} changes in 12 frames)`);
});

test('a far hero or nobody sets nothing off; a near one sets the halt off after ALERT: arm out at him, club drawn back', () => {
  for (const n of NAMES) {
    const a = make(n), built = snap(a);
    assert.equal(run(a, 5, false, FARAWAY), 0); assert.equal(run(a, 2, false, null), 0);
    assert.equal(snap(a), built, `${n}: untouched with nobody near`);
    const P = rolesOf(a), s = a.g.scale.x, fist0 = P['paw:lf']().z, club0 = P['paw:rf']().z;
    assert.equal(run(a, ALERT - .1, false, NEARBY), 0, `${n}: waits ALERT`);
    run(a, .1 + OUT * LEN + .3, false, NEARBY); a.g.updateMatrixWorld(true);
    assert.equal(a.kopHalt.h, 1, `${n}: in the halt`);
    assert(P['paw:lf']().z > fist0 + .1 * s, `${n}: the stopping arm thrust out ahead`);
    assert(P['paw:rf']().z < club0 - .1 * s, `${n}: the club fist drawn back behind the helmet`);
  }
});

test('it ends exactly at attention, and goes again AGAIN seconds after while the hero stays', () => {
  for (const n of NAMES) {
    const a = make(n), built = snap(a);
    run(a, ALERT + LEN + .2, false, NEARBY);
    assert.equal(a.kopHalt.t, null); assert.equal(snap(a), built, `${n}: back exactly`);
    assert.equal(run(a, AGAIN - .5, false, NEARBY), 0, `${n}: not again too soon`);
    let peak = 0; for (let i = 0; i < 40; i++) peak = Math.max(peak, run(a, .05, false, NEARBY));
    assert(peak > .9, `${n}: again after AGAIN`);
  }
});

test('never while walking, acting or dead; breaking off drops it and returns everything exactly', () => {
  for (const kill of ['busy', 'dead']) {
    const a = make(NAMES[0]), built = snap(a);
    if (kill === 'dead') a.actions = {dead: true};
    assert.equal(run(a, 5, kill === 'busy', NEARBY), 0, kill); assert.equal(snap(a), built, kill);
  }
  for (const n of NAMES) {
    const a = make(n), built = snap(a);
    run(a, ALERT + 1, false, NEARBY); assert(a.kopHalt.h > .5, n);
    run(a, .5, true, NEARBY);
    assert.equal(a.kopHalt.t, null); assert.equal(snap(a), built, `${n}: broken off, back exactly`);
  }
});

test('a Kop at ease comes to attention first, then halts; it all ends exactly at attention', () => {
  for (const n of NAMES) {
    const a = make(n), built = snap(a);
    run(a, SETTLE + 4, false, null); assert.equal(a.kopRest.p, 1, `${n}: at ease`);
    let both = false;
    for (let i = 0; i < 40; i++) { run(a, .05, false, NEARBY); if (a.kopRest.p > 0 && a.kopHalt.h > 0) both = true; }
    assert(!both, `${n}: never halts while still coming to attention`);
    assert.equal(a.kopRest.p, 0); assert(a.kopHalt.t != null, `${n}: halts once at attention`);
    run(a, LEN + .2, false, FARAWAY);
    assert.equal(snap(a), built, `${n}: at attention exactly`);
  }
});

test('40 s of standing at ease, halting and walking off end exactly at attention', () => {
  for (const n of NAMES) {
    const a = make(n), built = snap(a);
    let rested = false, halted = false;
    for (let i = 0; i < 800; i++) {
      const look = i < 300 ? null : i < 600 ? NEARBY : FARAWAY, busy = i > 760;
      updateKopSettle(a, .05, busy, look);
      rested ||= a.kopRest.p === 1; halted ||= a.kopHalt.h === 1;
    }
    assert(rested && halted, `${n}: it stood at ease and halted`);
    assert.equal(snap(a), built, n);
  }
});

test('the hero is "near" on the settle\'s own range', () => { assert(Math.hypot(NEARBY.x, NEARBY.z) < NEAR && FARAWAY.x > NEAR); });
