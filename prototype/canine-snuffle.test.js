import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateCanineSnuffle, snufflePose, snuffles, DIP, SWEEP, COCK, FIRST_MIN, FIRST_SPAN} from './canine-snuffle.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateCanineSnuffle(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.rotation.z];

test('the snuffle pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = snufflePose(0), dip = 0, sweepHi = 0, sweepLo = 0, cock = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = snufflePose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.dip >= 0 && p.dip <= DIP + 1e-12 && Math.abs(p.sweep) <= SWEEP + 1e-12 && p.cock >= 0 && p.cock <= COCK + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .08, `${k} jumps at ${u}`);
    prev = p; dip = Math.max(dip, p.dip); cock = Math.max(cock, p.cock); sweepHi = Math.max(sweepHi, p.sweep); sweepLo = Math.min(sweepLo, p.sweep);
  }
  assert(Object.values(snufflePose(0)).every(v => v === 0) && Object.values(snufflePose(1)).every(v => v === 0));
  assert(Object.values(snufflePose(.5, 0)).every(v => v === 0) && Object.values(snufflePose(NaN)).every(v => v === 0));
  assert(dip > DIP * .99 && cock > COCK * .99, 'the nose drops and the head cocks');
  assert(sweepHi > SWEEP * .8 && sweepLo < -SWEEP * .8, 'the head swings both ways along the trail');
  assert(snufflePose(.7).dip === 0 && snufflePose(.7).cock > 0, 'the nose comes up for the stare');
});

test('an idle jackal snuffles now and then, and returns exactly to rest', () => {
  const a = make('jackal', 'd'), dt = 1 / 60, rest = snap(a);
  assert(snuffles(a));
  let count = 0, first = null;
  for (let k = 0; k < 60 * 80; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.canineSnuffle.counted) { a.canineSnuffle.counted = true; count++; }
    if (!p && a.canineSnuffle) a.canineSnuffle.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `snuffled ${count} times`);
});

test('walking fades a snuffle out and an attack blocks one', () => {
  const a = make('jackal', 'd'), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 60; k++) frame(a, dt);
  assert(a.canineSnuffle.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.canineSnuffle.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('jackal', 'd');
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('pets and other monsters do not snuffle', () => {
  for (const [n, s] of [['little dog', 'd'], ['kobold', 'k'], ['gnome', 'G'], ['troll', 'T']]) assert(!snuffles(make(n, s)), n);
});
