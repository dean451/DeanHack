import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateTuck, peekPose, peekLength, tucks, HEAD_BACK, HEAD_DOWN, TAIL_IN, HOLD_MIN, HOLD_SPAN, PEEK} from './tuck.js';

const COLON = ':'.charCodeAt(0);
const turtle = () => { const a = createCreature({name: 'giant turtle', symbol: COLON, color: 2}); a.actions = createActionQueue(); return a; };
const pos = o => o.position.toArray();
const near = (a, b, msg) => assert(a.every((v, i) => Math.abs(v - b[i]) < 1e-12), `${msg}: ${a} vs ${b}`);
const beakZ = a => { a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.head).max.z; };

// One frame as live.js runs it: clear the action pose, run the actions, then tuck.
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateTuck(a, dt, walking);
}

test('the peek comes halfway out, pauses, then all the way out without jumps', () => {
  const n = 2000, len = peekLength();
  let prev = 1;
  for (let i = 0; i <= n; i++) {
    const v = peekPose(len * i / n);
    assert(Number.isFinite(v) && v >= 0 && v <= 1, `${i} ${v}`);
    assert(v <= prev + 1e-12, 'never goes back in');
    assert(prev - v < .01, `no jumps at ${i}`);
    prev = v;
  }
  assert.equal(peekPose(0), 1);
  assert(Math.abs(peekPose(1.1) - (1 - PEEK)) < 1e-12, 'held halfway in the pause');
  assert(peekPose(len) < 1e-12);
  assert.equal(peekPose(NaN), 1);
});

test('a struck giant turtle pulls its head into its shell, then peeks back out to rest', () => {
  const a = turtle(), head0 = pos(a.head), tail0 = pos(a.tail), z0 = beakZ(a), dt = 1 / 60;
  assert(tucks(a));
  assert(!tucks(createCreature({name: 'crocodile', symbol: COLON, color: 2})), 'only turtles tuck');
  for (let i = 0; i < 60; i++) assert.equal(frame(a, dt), 0, 'nothing while untouched');
  assert.deepEqual(pos(a.head), head0);

  enqueueAction(a.actions, {kind: 'hit', dir: [0, 1], attack: 'claw'});
  let t = 0, most = 0, prev = 0, inAt = -1, outAt = -1;
  for (; t < 10; t += dt) {
    const f = frame(a, dt);
    assert(Number.isFinite(f) && f >= 0 && f <= 1, `${t} ${f}`);
    // The snap in is quick but eased; the way out is slower still.
    assert(f - prev < .4 && prev - f < .02, `no jumps at ${t}: ${prev} -> ${f}`);
    const h = pos(a.head), tl = pos(a.tail);
    assert(Math.abs(h[2] - (head0[2] - f * HEAD_BACK)) < 1e-9 && Math.abs(h[1] - (head0[1] - f * HEAD_DOWN)) < 1e-9);
    assert(Math.abs(tl[2] - (tail0[2] + f * TAIL_IN)) < 1e-9);
    if (f > most) most = f;
    if (f > .99 && inAt < 0) inAt = t;
    if (f > .99 && !a.actions.current) { const z = beakZ(a); assert(z < z0 - .14 && z < .45, `only the beak is left past the rim (${z})`); }
    if (inAt >= 0 && f === 0 && outAt < 0) outAt = t;
    prev = f;
  }
  assert(inAt >= 0 && inAt < .5, `in fast (${inAt})`);
  assert(outAt > HOLD_MIN && outAt < .5 + HOLD_MIN + HOLD_SPAN + peekLength(), `held, then out (${outAt})`);
  near(pos(a.head), head0, 'head back at rest');
  near(pos(a.tail), tail0, 'tail back at rest');
});

test('walking brings it out quickly, a new blow sends it back in, and a dead turtle stays in', () => {
  const a = turtle(), head0 = pos(a.head), dt = 1 / 60;
  enqueueAction(a.actions, {kind: 'hit', dir: [1, 0], attack: 'bite'});
  for (let i = 0; i < 60; i++) frame(a, dt);
  assert(a.tuck.f > .99);
  // Walking off right away: out within a second, smoothly.
  let prev = a.tuck.f, t = 0;
  for (; t < 1 && a.tuck.f > 0; t += dt) { frame(a, dt, true); assert(prev - a.tuck.f < .15); prev = a.tuck.f; }
  assert.equal(a.tuck.f, 0, `out while walking (${t})`);
  near(pos(a.head), head0, 'out after walking');

  // Struck mid-peek: straight back in, and the hold restarts.
  enqueueAction(a.actions, {kind: 'hit', dir: [1, 0], attack: 'bite'});
  for (let i = 0; i < 60 * 3; i++) frame(a, dt);
  assert(a.tuck.f > 0 && a.tuck.f < 1, 'peeking');
  enqueueAction(a.actions, {kind: 'hit', dir: [1, 0], attack: 'bite'});
  for (let i = 0; i < 30; i++) frame(a, dt);
  assert(a.tuck.f > .99, 'back in');

  enqueueAction(a.actions, {kind: 'die', style: 'topple', dir: [1, 0]});
  for (let i = 0; i < 60 * 12; i++) frame(a, dt, i % 2 === 0);
  assert.equal(a.tuck.f, 1, 'dead and tucked');
  for (const v of [...pos(a.head), ...pos(a.tail)]) assert(Number.isFinite(v));
  // Junk dt never breaks it.
  for (const d of [NaN, -1, Infinity]) assert(Number.isFinite(updateTuck(a, d)));
});
