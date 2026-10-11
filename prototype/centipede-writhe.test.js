import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateCentipedeWrithe, writhePose, writhes, SWEEP, FLINCH, FIRST_MIN, FIRST_SPAN} from './centipede-writhe.js';

const make = (name = 'centipede') => {
  const a = createCreature({name, symbol: 'a'.charCodeAt(0), color: 3});
  a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateCentipedeWrithe(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.body.rotation.x, a.body.rotation.y, a.body.rotation.z, a.body.position.y];

test('the writhe pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 20000;
  let sweepMax = 0, sweepMin = 0, flinch = 0, prev = writhePose(0);
  for (let i = 0; i <= n; i++) {
    const p = writhePose(i / n);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(Math.abs(p.sweep) <= 1 + 1e-12 && p.flinch >= 0 && p.flinch <= 1 + 1e-12);
    assert(Math.abs(p.sweep - prev.sweep) < .02 && Math.abs(p.flinch - prev.flinch) < .02, `jump at ${i / n}`);
    prev = p; sweepMax = Math.max(sweepMax, p.sweep); sweepMin = Math.min(sweepMin, p.sweep); flinch = Math.max(flinch, p.flinch);
  }
  assert(Object.values(writhePose(0)).every(v => v === 0) && Object.values(writhePose(1)).every(v => v === 0));
  assert(Object.values(writhePose(.5, 0)).every(v => v === 0) && Object.values(writhePose(NaN)).every(v => v === 0));
  assert(sweepMax > .8 && sweepMin < -.8, 'the body sweeps both ways');
  assert(flinch > .95, 'and ends with a flinch');
  assert(SWEEP > 0 && FLINCH > 0);
});

test('an idle centipede writhes now and then, and returns exactly to rest', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  assert(writhes(a));
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
  assert(count >= 2, `writhed ${count} times`);
});

test('walking fades a writhe out and an attack blocks one', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.centipedeWrithe.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.centipedeWrithe.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make();
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other insects do not writhe', () => {
  assert(!writhes(createCreature({name: 'giant ant', symbol: 'a'.charCodeAt(0), color: 1})));
  assert(!writhes(createCreature({name: 'locust', symbol: 'a'.charCodeAt(0), color: 0})));
});
