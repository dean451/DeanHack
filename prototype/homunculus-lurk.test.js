import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateHomunculusLurk, lurkPose, lurks, SINK, STARE, TWITCH, FIRST_MIN, FIRST_SPAN} from './homunculus-lurk.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateHomunculusLurk(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.rotation.z, ...a.wings.map(w => w.rotation.z)];

test('the pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = lurkPose(0);
  const peak = {};
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = lurkPose(u);
    for (const [k, v] of Object.entries(p)) {
      assert(Number.isFinite(v));
      assert(Math.abs(v) <= {sink: SINK, stare: STARE, twitch: TWITCH}[k] + 1e-12, `${k} out of bounds at ${u}`);
      assert(Math.abs(v - prev[k]) < .25, `${k} jumps at ${u}`);
      peak[k] = Math.max(peak[k] ?? 0, Math.abs(v));
    }
    prev = p;
  }
  assert(Object.values(lurkPose(0)).every(v => v === 0) && Object.values(lurkPose(1)).every(v => v === 0));
  assert(Object.values(lurkPose(.5, 0)).every(v => v === 0) && Object.values(lurkPose(NaN)).every(v => v === 0));
  for (const [k, v] of Object.entries(peak)) assert(v > {sink: SINK, stare: STARE, twitch: TWITCH}[k] * .5, `${k} barely moves`);
});

test('an idle homunculus does it now and then, and returns exactly to rest', () => {
  const a = make('homunculus', 'i'), dt = 1 / 60, rest = snap(a);
  assert(lurks(a));
  let count = 0, first = null, was = false;
  for (let k = 0; k < 60 * 80; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !was) count++;
    was = !!p;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `${count} times`);
});

test('walking fades it out and an attack blocks it', () => {
  const a = make('homunculus', 'i'), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 60; k++) frame(a, dt);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  frame(a, dt, true);
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('homunculus', 'i');
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters do not do it', () => {
  for (const [n, s] of [['dwarf', 'h'], ['tengu', 'i'], ['kobold', 'k'], ['troll', 'T']]) assert(!lurks(make(n, s)), n);
});
