import test from 'node:test';
import assert from 'node:assert/strict';
import {arcPose, dripPose, bubblePose, isDrainMessage, createSinkDrain, DRAIN} from './sink-drain.js';

test('only the drain message triggers it', () => {
  assert.ok(isDrainMessage('You drop a diamond ring down the drain.'));
  for (const t of ['You drop a dagger.', 'The sink gurgles.', 'You drop it.', null]) assert.ok(!isDrainMessage(t), String(t));
});

test('every part starts and ends hidden and stays in bounds', () => {
  for (const t of [0, DRAIN.total]) {
    assert.equal(bubblePose(t).alpha, 0);
    assert.equal(dripPose(t).alpha, 0);
    for (let i = 0; i < DRAIN.arcs; i++) assert.equal(arcPose(i, t).alpha, 0);
  }
  for (let t = 0; t <= DRAIN.total; t += .005) {
    for (let i = 0; i < DRAIN.arcs; i++) { const p = arcPose(i, t); assert.ok(p.scale > 0 && p.scale <= .4 && p.alpha >= 0 && p.alpha <= .5, `${i} ${t}`); }
    const d = dripPose(t); assert.ok(d.y >= 0 && d.y <= .5 && d.alpha >= 0 && d.alpha <= 1);
    const b = bubblePose(t); assert.ok(b.scale > 0 && b.scale <= .1 && b.alpha >= 0 && b.alpha <= .45);
  }
});

test('the arcs tighten as they turn, the drip falls after them and the bubble is last', () => {
  let last = Infinity; for (let t = .05; t < .55; t += .01) { const s = arcPose(0, t).scale; assert.ok(s <= last + 1e-9); last = s; }
  assert.equal(arcPose(1, .05).alpha, 0, 'the second arc trails the first');
  assert.equal(dripPose(.25).alpha, 0);
  assert.ok(dripPose(.4).alpha > 0 && bubblePose(.4).alpha === 0);
  assert.ok(bubblePose(.8).alpha > 0 && arcPose(0, .8).alpha === 0);
});

test('a drained ring starts an effect that is cleaned up', () => {
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}}; this.rotation = {}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createSinkDrain(THREE, {add() {}, remove() {}});
  fx.message('You drop a ring down the drain.', 1, 2);
  assert.equal(fx.active, 1);
  fx.update(DRAIN.total + .1);
  assert.equal(fx.active, 0);
});
