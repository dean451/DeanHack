import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateTuck} from './tuck.js';
import {updatePlod, plodPose, plods, PLOD} from './plod.js';

const COLON = ':'.charCodeAt(0);
const turtle = () => { const a = createCreature({name: 'giant turtle', symbol: COLON, color: 2}); a.actions = createActionQueue(); return a; };

// One frame as live.js runs it: the generic leg swing and body bob, the plod, the actions, the tuck.
function frame(a, t, dt, walking) {
  clearActionPose(a, a.actions);
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .015;
  const p = updatePlod(a, dt, walking);
  updateActions(a, a.actions, dt);
  updateTuck(a, dt, walking);
  return p;
}
const snap = a => [...a.legs.map(l => l.rotation.x), a.body.rotation.z, a.head.rotation.x];

test('the plod moves diagonal pairs together, within its stride', () => {
  for (let i = 0; i <= 400; i++) {
    const p = plodPose(Math.PI * 2 * i / 400);
    for (const v of [...p.legs, p.bob, p.roll, p.nod]) assert(Number.isFinite(v));
    assert.equal(p.legs[0], p.legs[3], 'front-left with hind-right');
    assert.equal(p.legs[1], p.legs[2], 'front-right with hind-left');
    assert.equal(p.legs[0], -p.legs[1]);
    assert(Math.abs(p.legs[0]) <= PLOD.stride && Math.abs(p.roll) <= PLOD.roll && p.bob <= 0 && p.bob >= -PLOD.dip && p.nod >= 0 && p.nod <= PLOD.nod);
  }
  assert.deepEqual(plodPose(1, 0), {legs: [0, 0, 0, 0], bob: 0, roll: 0, nod: 0});
  assert(plods(turtle()));
  assert(!plods(createCreature({name: 'crocodile', symbol: COLON, color: 2})), 'only turtles plod');
  assert.equal(updatePlod(createCreature({name: 'crocodile', symbol: COLON, color: 2}), 1 / 60, true), null);
});

test('a walking giant turtle plods slowly, then settles back to its exact rest pose', () => {
  const a = turtle(), rest = snap(a), dt = 1 / 60;
  let t = 0, prev = snap(a), worst = 0;
  for (let i = 0; i < 240; i++, t += dt) {
    const walking = i < 120;
    frame(a, t, dt, walking);
    const now = snap(a);
    now.forEach(v => assert(Number.isFinite(v)));
    if (i > 30 && walking) {
      // fully blended in: only the slow stride remains, no generic scurry
      a.legs.forEach(l => assert(Math.abs(l.rotation.x) <= PLOD.stride + 1e-9, `${i} ${l.rotation.x}`));
      assert(Math.abs(a.body.rotation.z) <= PLOD.roll + 1e-9);
    }
    if (i > 30) worst = Math.max(worst, ...now.map((v, k) => Math.abs(v - prev[k])));
    prev = now;
  }
  // 7 rad/s × .2 rad ≈ .023 rad per frame at most; the generic swing moved up to .15
  assert(worst < .035, `smooth (${worst})`);
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-12, `back to rest ${k}: ${v} vs ${rest[k]}`));
  assert.equal(a.plod.w, 0);
});

test('a blow mid-plod and death both leave the head and shell at rest', () => {
  const a = turtle(), rest = snap(a), dt = 1 / 60;
  let t = 0;
  for (let i = 0; i < 40; i++, t += dt) frame(a, t, dt, true);
  enqueueAction(a.actions, {kind: 'hit', dir: [0, 1], attack: 'claw'});
  for (let i = 0; i < 400; i++, t += dt) frame(a, t, dt, i < 20);
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9, `after a blow ${k}: ${v} vs ${rest[k]}`));

  for (let i = 0; i < 40; i++, t += dt) frame(a, t, dt, true);
  a.actions.dead = true;
  for (let i = 0; i < 120; i++, t += dt) frame(a, t, dt, true);
  assert.equal(a.plod.w, 0, 'a dead turtle stops plodding');
  assert(Math.abs(a.body.rotation.z - rest[4]) < 1e-12);
});

// The spider skitter's tests live in their own file; it's imported here until it has a line in
// package.json's test list (the ants PR #286 was changing that line).
import './skitter.test.js';
