import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateRatSettle} from './rat-settle.js';
import {washFor, washMotion, LEN, ADJ, AGAIN, UP, STILL, DOWN} from './rat-washing.js';
import {WASH_POSES} from './rat-wash-poses.js';
import {washPose} from './rat-wash.js';
import {NEAR} from './insect-settle.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the rats (family r), step 2: the hero coming near sets off the nervous face wash.
const FAMILY = ['enormous rat', 'giant rat', 'rabid rat', 'sewer rat'];
const make = name => { const a = createCreature({name, symbol: 114, color: 7}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray(), a.body.rotation.toArray().slice(0, 3)]);
const at = (a, d, side = 0) => ({x: a.g.position.x + side, z: a.g.position.z + d});
const run = (a, secs, look, busy = false) => { for (let i = 0; i < Math.round(secs * 20); i++) updateRatSettle(a, .05, busy, look); };

test('every rat has a baked wash that met every goal; the sewer rat\'s still matches a fresh solve', () => {
  for (const n of FAMILY) { assert(WASH_POSES[n]?.ok, `${n} is baked and ok (node tools/bake-rat-wash.mjs)`); assert(washFor(make(n)), n); }
  const fresh = washPose(make('sewer rat')).pose, baked = WASH_POSES['sewer rat'].pose;
  for (const [j, o] of Object.entries(fresh)) {
    if (typeof o !== 'object') { assert(Math.abs(o - (baked[j] ?? 0)) < 2e-3, j); continue; }
    for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[j]?.[ax] ?? 0)) < 2e-3, `${j}.${ax}`);
  }
  for (const n of ['rothe', 'jackal']) assert(!washFor(make(n)), n);
});

test('the motion: zero at both ends, the strokes stop dead on a zero crossing, the stare only after them', () => {
  for (const u of [0, 1, -1, 2, NaN]) assert.deepEqual(washMotion(u), {up: 0, stroke: 0, stare: 0});
  assert.equal(washMotion((UP + STILL) / 2).up, 1);
  assert(Math.abs(washMotion(STILL - 1e-5).stroke) < .01, 'the last stroke ends at zero');
  assert.equal(washMotion(STILL + .01).stroke, 0);
  assert.equal(washMotion(STILL - .01).stare, 0);
  assert(washMotion((STILL + DOWN) / 2).stare > .99, 'the stare is held');
});

test('the hero coming near (not beside) sits it up, tall, both forepaws at the nose', () => {
  for (const n of FAMILY) {
    const a = make(n), P = rolesOf(a), s = a.g.scale.x, withers0 = P.withers().y;
    run(a, LEN * (UP + STILL) / 2, at(a, 2.5));
    a.g.updateMatrixWorld(true);
    assert(P.withers().y > withers0 * 1.6, `${n}: reared up`);
    for (const side of ['l', 'r']) assert(P[`paw:${side}f`]().distanceTo(P.mouth()) < .5 * withers0, `${n}: ${side} forepaw by the nose`);
    assert(a.ratWash.u > 0 && s > 0);
  }
});

test('not with the hero beside it, far off or unseen, nor while moving or dead', () => {
  const cases = [[at(make('sewer rat'), ADJ - .5), false], [at(make('sewer rat'), NEAR + 2), false], [null, false], [at(make('sewer rat'), 2.5), true]];
  for (const [look, busy] of cases) { const a = make('sewer rat'), built = snap(a); run(a, 2, look, busy); assert.equal(a.ratWash.u, null); assert.equal(snap(a), built); }
  const d = make('sewer rat'); d.actions = {dead: true}; run(d, 2, at(d, 2.5)); assert.equal(d.ratWash.u, null);
});

test('the forepaws stroke, then stop dead while the head turns to stare at the hero', () => {
  const a = make('giant rat'), look = at(a, 2, 1.5), elbow = a.joints.lleg0_1, head = a.joints.head, y0 = head.rotation.y;
  run(a, LEN * (UP + .1), look);
  const seen = [];
  for (let i = 0; i < 12; i++) { updateRatSettle(a, .05, false, look); seen.push(elbow.rotation.x); }
  assert(Math.max(...seen) - Math.min(...seen) > .1, 'the forearm swings');
  run(a, LEN * (STILL + .04 - UP - .1) - .6, look);
  const still = [];
  for (let i = 0; i < 4; i++) { updateRatSettle(a, .05, false, look); still.push(elbow.rotation.x); }
  assert(Math.max(...still) - Math.min(...still) < 1e-9, 'the paws hold still');
  assert(head.rotation.y - y0 > .3, 'the head turned toward the hero, on its +x side');
});

test('ending, or broken off by the hero stepping up or the rat moving, returns everything exactly', () => {
  for (const n of FAMILY) {
    const a = make(n), built = snap(a), look = at(a, 2.5);
    run(a, LEN / 2, look); assert.notEqual(snap(a), built, n);
    run(a, LEN / 2 + .2, look); assert.equal(a.ratWash.u, null, n); assert.equal(snap(a), built, `${n}: back exactly after the wash`);
    const b = make(n), built2 = snap(b);
    run(b, LEN / 3, at(b, 2.5)); run(b, .5, at(b, 1)); assert.equal(b.ratWash.u, null); assert.equal(snap(b), built2, `${n}: back exactly, hero beside`);
    const c = make(n), built3 = snap(c);
    run(c, LEN / 3, at(c, 2.5)); run(c, .5, at(c, 2.5), true); assert.equal(c.ratWash.u, null); assert.equal(snap(c), built3, `${n}: back exactly, moving`);
  }
});

test('a hero who stays near sets off another wash only after AGAIN; leaving and coming back sets one off at once', () => {
  const a = make('sewer rat'), look = at(a, 3);
  run(a, LEN + .2, look); assert.equal(a.ratWash.u, null);
  run(a, AGAIN - 1, look); assert.equal(a.ratWash.u, null, 'not yet');
  run(a, 1.2, look); assert.notEqual(a.ratWash.u, null, 'again');
  const b = make('sewer rat');
  run(b, LEN + .2, at(b, 3)); run(b, .5, at(b, NEAR + 3)); run(b, .1, at(b, 3)); assert.notEqual(b.ratWash.u, null, 'back in range');
});
