import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateScorpionClack, clackPose, clacks, SPREAD, LIFT, TWITCH, FIRST_MIN, FIRST_SPAN} from './scorpion-clack.js';

const make = (name = 'scorpion') => {
  const a = createCreature({name, symbol: 's'.charCodeAt(0), color: 1});
  a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateScorpionClack(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [...a.claws.flatMap(c => [c.rotation.x, c.rotation.y, c.rotation.z]), a.tail.rotation.x, a.tail.rotation.y, a.tail.rotation.z];

test('the clack pose stays in bounds, snaps the pincers three times and starts and ends at rest', () => {
  const n = 6000;
  let prev = clackPose(0), spread = 0, lift = 0, twitchMax = 0, twitchMin = 0, closes = 0, wasOpen = false;
  for (let i = 0; i <= n; i++) {
    const p = clackPose(i / n);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.spread >= 0 && p.spread <= 1 + 1e-12 && p.lift >= 0 && p.lift <= 1 + 1e-12 && Math.abs(p.twitch) <= 1 + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .05, `${k} jumps at ${i / n}`);
    const open = p.spread > .5;
    if (wasOpen && !open) closes++;
    wasOpen = open;
    prev = p; spread = Math.max(spread, p.spread); lift = Math.max(lift, p.lift);
    twitchMax = Math.max(twitchMax, p.twitch); twitchMin = Math.min(twitchMin, p.twitch);
  }
  assert(Object.values(clackPose(0)).every(v => v === 0) && Object.values(clackPose(1)).every(v => v === 0));
  assert(Object.values(clackPose(.3, 0)).every(v => v === 0) && Object.values(clackPose(NaN)).every(v => v === 0));
  assert.equal(closes, 3, 'the pincers snap shut three times');
  assert(spread > .95 && lift > .95, 'the pincers open wide and rise');
  assert(twitchMin < -.5 && twitchMax > .9, 'the tail cocks back then jabs');
  assert(SPREAD > 0 && LIFT > 0 && TWITCH > 0);
});

test('an idle scorpion clacks now and then, and returns exactly to rest', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  assert(clacks(a));
  let count = 0, first = null;
  for (let k = 0; k < 60 * 90; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.scorpionClack.counted) { a.scorpionClack.counted = true; count++; }
    if (!p && a.scorpionClack) a.scorpionClack.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `clacked ${count} times`);
});

test('walking fades a clack out and an attack blocks one', () => {
  const a = make('Scorpius'), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.scorpionClack.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.scorpionClack.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make();
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('spiders and wraiths do not clack', () => {
  const spider = createCreature({name: 'giant spider', symbol: 's'.charCodeAt(0), color: 5});
  assert(!clacks(spider));
  assert(!clacks(createCreature({name: 'wraith', symbol: 'W'.charCodeAt(0), color: 0})));
});
