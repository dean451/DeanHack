import test from 'node:test';
import assert from 'node:assert/strict';
import {platePose, dustPose, isLimberMessage, createStoneCure, CURE} from './stone-cure.js';

test('only the limber message triggers it', () => {
  assert.ok(isLimberMessage('You feel limber!'));
  for (const t of ['You are slowing down.', 'Your limbs have turned to stone.', 'You feel better.', null]) assert.ok(!isLimberMessage(t), String(t));
});

test('every part starts and ends hidden and stays in bounds', () => {
  for (const t of [0, CURE.total]) {
    assert.equal(dustPose(t).alpha, 0);
    for (let i = 0; i < CURE.plates; i++) assert.equal(platePose(i, t).alpha, 0);
  }
  for (let t = 0; t <= CURE.total; t += .005) {
    for (let i = 0; i < CURE.plates; i++) {
      const p = platePose(i, t);
      assert.ok(p.y >= 0 && p.y <= .8 && Math.hypot(p.x, p.z) <= .17 && p.alpha >= 0 && p.alpha <= 1, `${i} ${t}`);
    }
    const d = dustPose(t); assert.ok(d.scale > 0 && d.scale <= .5 && d.alpha >= 0 && d.alpha <= .4);
  }
});

test('plates only fall, and the first clings on longer than the rest', () => {
  for (let i = 0; i < CURE.plates; i++) {
    let last = Infinity; for (let t = 0; t < CURE.total; t += .005) { const p = platePose(i, t); if (p.alpha > 0) { assert.ok(p.y <= last + 1e-9, `${i} ${t}`); last = p.y; } }
  }
  assert.equal(platePose(0, .15).alpha, 0);
  assert.ok(platePose(1, .15).alpha > 0);
});

test('a cure starts an effect that is cleaned up', () => {
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}}; this.rotation = {set() {}}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createStoneCure(THREE, {add() {}, remove() {}});
  fx.message('You feel limber!', 1, 2);
  assert.equal(fx.active, 1);
  fx.update(CURE.total + .1);
  assert.equal(fx.active, 0);
});
