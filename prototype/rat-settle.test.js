import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateRatSettle, restFor, rests, FAMILY} from './rat-settle.js';
import {REST_POSES} from './rat-rest-poses.js';
import {restPose} from './rat-rest.js';
import {updateRatSniff} from './rat-sniff.js';
import {LEN} from './rat-washing.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the rats (family r), step 1: an idle rat hunches down in play.
// (live-apply.js names every actor by its cell: `species` is the lower-case monster name)
const make = name => { const a = createCreature({name, symbol: 114, color: 7}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray(), a.body.rotation.toArray().slice(0, 3)]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateRatSettle(a, .05, busy, look); return p; };

test('every rat has a baked hunch that met every goal, so none is solved mid-play; nothing else hunches', () => {
  for (const n of FAMILY) { assert(REST_POSES[n]?.ok, `${n} is baked and ok (node tools/bake-rat-rest.mjs)`); assert(restFor(make(n)), n); }
  for (const n of ['rothe', 'jackal', 'newt']) { const a = make(n); assert(!rests(a), n); assert.equal(run(a, SETTLE + SETTLING + 1), 0, n); }
});

test('the baked sewer and enormous rat hunches still match a fresh solve (re-bake after changing a rat or the goals)', () => {
  for (const n of ['sewer rat', 'enormous rat']) {
    const fresh = restPose(make(n)).pose, baked = REST_POSES[n].pose;
    assert(Math.abs(fresh.hipsY - baked.hipsY) < 2e-3, `${n} hipsY`);
    for (const [j, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[j]?.[ax] ?? 0)) < 2e-3, `${n} ${j}.${ax}`);
  }
});

test('left alone it hunches after the wait, the back and nose down, and not before', () => {
  for (const n of FAMILY) {
    const a = make(n), built = snap(a), P = rolesOf(a), withers0 = P.withers().y, mouth0 = P.mouth().y;
    assert.equal(run(a, SETTLE - .5), 0, n); assert.equal(snap(a), built, `${n}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, n); a.g.updateMatrixWorld(true);
    assert(P.withers().y < withers0 - .03 * a.g.scale.x, `${n}: the back came down`);
    assert(P.mouth().y < mouth0 - .03 * a.g.scale.x, `${n}: the nose sank`);
  }
});

test('never while moving, acting or dead: the wait starts over', () => {
  const a = make('sewer rat'); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const c = make('sewer rat'); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead');
});

test('a hero close by keeps it up; a far one does not', () => {
  const a = make('giant rat'), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('rising, also mid-settle, returns every joint and the body exactly to the awake values', () => {
  for (const n of FAMILY) {
    const a = make(n), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built, n);
    assert.equal(run(a, RISE + 1, true), 0, n); assert.equal(snap(a), built, `${n}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateRatSettle(a, 0, false); assert(mid > 0 && mid < 1, n);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${n}: back exactly from mid-settle`);
  }
});

test('the idle sniff over a hunched rat leaves nothing behind once it gets up', () => {
  // The game's frame order: fidget.js's sniff first, rat-settle.js last. The control runs the same sniffs with no
  // hunch, so any difference once both stand is the hunch leaving something behind.
  for (const n of FAMILY) {
    const a = make(n), c = make(n), far = {x: 50, z: 50}, near = {x: a.g.position.x + 2, z: a.g.position.z};
    for (const k of [a, c]) k.ratSniff = {seed: 4242, wait: 0, s: null, f: 0, o: {x: 0, y: 0, z: 0, b: 0}};
    let sniffed = 0;
    const frames = (k, secs, look, settle) => { for (let i = 0; i < Math.round(secs * 20); i++) { if (updateRatSniff(k, .05, i * .05, false)) sniffed++; if (settle) updateRatSettle(k, .05, false, look); } };
    frames(a, SETTLE + SETTLING + 40, far, true); frames(c, SETTLE + SETTLING + 40, far, false);
    assert.equal(a.ratRest.p, 1, `${n}: it hunched`); assert(sniffed > 0, `${n}: sniffs fired over the hunch`);
    // the hero 2 m off gets it up and sets off the wash too, run to its end
    frames(a, RISE + LEN + 1.5, near, true); frames(c, RISE + LEN + 1.5, near, false);
    assert.equal(a.ratRest.p, 0, `${n}: up`); assert.equal(a.ratWash.u, null, `${n}: washed and done`);
    const pa = JSON.parse(snap(a)).flat(2), pc = JSON.parse(snap(c)).flat(2);
    pa.forEach((v, i) => assert(Math.abs(v - pc[i]) < 1e-9, `${n}: value ${i} drifted by ${(v - pc[i]).toExponential(2)}`));
  }
});
