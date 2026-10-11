import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateFelineWatch, watchPose, watches, CROUCH, TRACK, TWITCH, FIRST_MIN, FIRST_SPAN} from './feline-watch.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateFelineWatch(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.rotation.z, a.tail.rotation.z];

test('the watch pose stays in bounds, snaps in steps and starts and ends at rest', () => {
  const n = 6000;
  let prev = watchPose(0), crouch = 0, hi = 0, lo = 0, twitch = 0, snaps = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = watchPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.crouch >= 0 && p.crouch <= CROUCH + 1e-12 && Math.abs(p.track) <= TRACK * 1.01 && p.twitch >= 0 && p.twitch <= TWITCH + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .08, `${k} jumps at ${u}`);
    if (Math.abs(p.track - prev.track) > 0.004) snaps++;
    prev = p; crouch = Math.max(crouch, p.crouch); hi = Math.max(hi, p.track); lo = Math.min(lo, p.track); twitch = Math.max(twitch, p.twitch);
  }
  assert(Object.values(watchPose(0)).every(v => v === 0) && Object.values(watchPose(1)).every(v => v === 0));
  assert(Object.values(watchPose(.5, 0)).every(v => v === 0) && Object.values(watchPose(NaN)).every(v => v === 0));
  assert(crouch > CROUCH * .99 && twitch > TWITCH * .95, 'the head sinks and the tail twitches');
  assert(hi > TRACK * .9 && lo < -TRACK * .2, 'the head is dragged across after the thing');
  assert(snaps > 0 && snaps < n / 4, 'the head moves in snaps with holds between');
  assert(Math.abs(watchPose(.999).track) < 1e-3, 'the head is home at the end');
});

test('an idle cat watches now and then, and returns exactly to rest', () => {
  const a = make('jaguar', 'f'), dt = 1 / 60, rest = snap(a);
  assert(watches(a));
  let count = 0, first = null;
  for (let k = 0; k < 60 * 90; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.felineWatch.counted) { a.felineWatch.counted = true; count++; }
    if (!p && a.felineWatch) a.felineWatch.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `watched ${count} times`);
});

test('walking fades a watch out and an attack blocks one', () => {
  const a = make('jaguar', 'f'), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.felineWatch.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.felineWatch.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('jaguar', 'f');
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters do not watch', () => {
  for (const [n, s] of [['jackal', 'd'], ['dwarf', 'h'], ['kobold', 'k'], ['troll', 'T']]) assert(!watches(make(n, s)), n);
});
