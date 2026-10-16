import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateElfListen, listenPose, listens, GRIND, CANT, POINT, FIRST_MIN, FIRST_SPAN} from './elf-listen.js';

const make = (name = 'Woodland-elf') => {
  const a = createCreature({name, symbol: '@'.charCodeAt(0), color: 3});
  a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateElfListen(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.body.position.y, ...[a.head, ...a.arms].flatMap(o => [o.rotation.x, o.rotation.y, o.rotation.z])];

test('the listen pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 8000, peak = {};
  let prev = listenPose(0);
  for (let i = 0; i <= n; i++) {
    const p = listenPose(i / n);
    for (const [k, v] of Object.entries(p)) {
      assert(Number.isFinite(v));
      assert(Math.abs(v) <= 1 + 1e-12 && (['grind'].includes(k) || v >= 0), `${k} out of bounds at ${i / n}`);
      assert(Math.abs(v - prev[k]) < .06, `${k} jumps at ${i / n}`);
      peak[k] = Math.max(peak[k] ?? 0, Math.abs(v));
    }
    prev = p;
  }
  assert(Object.values(listenPose(0)).every(v => v === 0) && Object.values(listenPose(1)).every(v => v === 0));
  assert(Object.values(listenPose(.5, 0)).every(v => v === 0) && Object.values(listenPose(NaN)).every(v => v === 0));
  for (const k of Object.keys(peak)) assert(peak[k] > .85, `${k} reaches ${peak[k]}`);
  for (const c of [GRIND, CANT, POINT]) assert(c > 0);
});

test('an idle elf listens now and then, and returns exactly to rest', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  assert(listens(a));
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

test('walking fades a listen out and an attack blocks one', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.elfListen.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.elfListen.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make();
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other creatures do not listen', () => {
  assert(!listens(createCreature({name: 'human zombie', symbol: 'Z'.charCodeAt(0), color: 1})));
  assert(!listens(createCreature({name: 'giant spider', symbol: 's'.charCodeAt(0), color: 5})));
});

test('the hand rubs once at the ear: it dips mid-hold and comes back', () => {
  const held = listenPose(.36).point, rub = listenPose(.41).point;
  assert.ok(rub < held - .1 && rub > 0, 'dips but stays raised');
  assert.ok(Math.abs(listenPose(.5).point - listenPose(.36).point) < .02, 'back up after');
});
