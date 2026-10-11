import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateZombieReach, reachPose, reaches, SAG, LOLL, TIP, REACH, SHAKE, FIRST_MIN, FIRST_SPAN} from './zombie-reach.js';

const make = (name = 'human zombie') => {
  const a = createCreature({name, symbol: 'Z'.charCodeAt(0), color: 3});
  a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateZombieReach(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.body.position.y, ...[a.head, ...a.arms].flatMap(o => [o.rotation.x, o.rotation.y, o.rotation.z])];

test('the reach pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 8000, peak = {};
  let prev = reachPose(0);
  for (let i = 0; i <= n; i++) {
    const p = reachPose(i / n);
    for (const [k, v] of Object.entries(p)) {
      assert(Number.isFinite(v));
      assert(Math.abs(v) <= 1 + 1e-12 && (['shake'].includes(k) || v >= 0), `${k} out of bounds at ${i / n}`);
      assert(Math.abs(v - prev[k]) < .06, `${k} jumps at ${i / n}`);
      peak[k] = Math.max(peak[k] ?? 0, Math.abs(v));
    }
    prev = p;
  }
  assert(Object.values(reachPose(0)).every(v => v === 0) && Object.values(reachPose(1)).every(v => v === 0));
  assert(Object.values(reachPose(.5, 0)).every(v => v === 0) && Object.values(reachPose(NaN)).every(v => v === 0));
  for (const k of Object.keys(peak)) assert(peak[k] > .85, `${k} reaches ${peak[k]}`);
  for (const c of [SAG, LOLL, TIP, REACH, SHAKE]) assert(c > 0);
});

test('an idle zombie reaches now and then, and returns exactly to rest', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  assert(reaches(a));
  let count = 0, first = null, was = false;
  for (let k = 0; k < 60 * 90; k++) {
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

test('walking fades a reach out and an attack blocks one', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.zombieReach.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.zombieReach.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make();
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other creatures do not reach', () => {
  assert(!reaches(createCreature({name: 'manes', symbol: 'i'.charCodeAt(0), color: 1})));
  assert(!reaches(createCreature({name: 'giant spider', symbol: 's'.charCodeAt(0), color: 5})));
});
