import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateTurtleGlare, glarePose, glares, TURN, LIFT, BITE, FIRST_MIN, FIRST_SPAN} from './turtle-glare.js';

const COLON = ':'.charCodeAt(0);
const make = (name = 'giant turtle', symbol = COLON) => {
  const a = createCreature({name, symbol, color: 2});
  a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateTurtleGlare(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.rotation.z];

test('the glare pose stays in bounds, bites in one hard snap and starts and ends at rest', () => {
  const n = 6000;
  let prev = glarePose(0), turn = 0, lift = 0, bite = 0, snaps = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = glarePose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(Math.abs(p.turn) <= TURN + 1e-12 && p.lift >= 0 && p.lift <= LIFT + 1e-12 && p.bite >= 0 && p.bite <= BITE + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .05, `${k} jumps at ${u}`);
    if (p.bite - prev.bite > .002) snaps++;
    prev = p; turn = Math.max(turn, p.turn); lift = Math.max(lift, p.lift); bite = Math.max(bite, p.bite);
  }
  assert(Object.values(glarePose(0)).every(v => v === 0) && Object.values(glarePose(1)).every(v => v === 0));
  assert(Object.values(glarePose(.5, 0)).every(v => v === 0) && Object.values(glarePose(NaN)).every(v => v === 0));
  assert(turn > TURN * .95 && lift > LIFT * .9, 'the head turns and lifts to stare');
  assert(bite > BITE * .95, 'the beak snaps shut');
  assert(snaps > 0 && snaps < n / 8, 'the bite is sudden, the rest is slow');
  // The stare is held still before the bite: the pose barely moves .45-.58.
  assert(Math.abs(glarePose(.58).turn - glarePose(.45).turn) < .02 * TURN * 10);
});

test('an idle turtle glares now and then, and returns exactly to rest', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  assert(glares(a));
  let count = 0, first = null;
  for (let k = 0; k < 60 * 90; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.turtleGlare.counted) { a.turtleGlare.counted = true; count++; }
    if (!p && a.turtleGlare) a.turtleGlare.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `glared ${count} times`);
});

test('walking fades a glare out and an attack blocks one', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.turtleGlare.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.turtleGlare.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make();
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other lizards do not glare', () => {
  for (const [n, s] of [['crocodile', ':'], ['newt', ':'], ['jackal', 'd']]) assert(!glares(make(n, s.charCodeAt(0))), n);
});

test('after the missed bite the head jerks sharply aside, then rests exactly', () => {
  const dip = glarePose(.77).turn - glarePose(.7).turn;
  assert.ok(glarePose(.77).turn < TURN * .6 && dip < -.05, `jerk ${dip}`);
  for (let u = 0; u <= 1; u += .005) assert.ok(Math.abs(glarePose(u).turn) <= TURN + 1e-9, `bound at ${u}`);
  assert.equal(glarePose(1).turn, 0);
});
