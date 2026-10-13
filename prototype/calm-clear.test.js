import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, isCalmMessage, createCalmClear, CALM} from './calm-clear.js';

test('only the confusion-lifted message triggers it', () => {
  assert.ok(isCalmMessage('You feel less confused now.'));
  for (const t of ['You feel somewhat dizzy.', 'You feel confused.', null]) assert.ok(!isCalmMessage(t), String(t));
});

test('rings start and end hidden and stay in bounds', () => {
  for (let i = 0; i < CALM.rings; i++) {
    for (const t of [0, CALM.total]) assert.equal(ringPose(i, t).alpha, 0);
    for (let t = 0; t <= CALM.total; t += .005) { const p = ringPose(i, t); assert.ok(p.y >= 0 && p.y <= 1.2 && p.scale > 0 && p.scale <= .3 && p.alpha >= 0 && p.alpha <= .42 && Math.abs(p.tilt) <= 1.3, `${i} ${t}`); }
  }
});

test('the rings sink and calm, the second lurches once more and the first does not', () => {
  assert.ok(ringPose(0, .6).y < ringPose(0, .2).y);
  assert.ok(ringPose(0, .6).tilt < ringPose(0, .2).tilt);
  let lurched = false; for (let t = .5; t < .95; t += .01) if (ringPose(1, t).tilt > ringPose(1, t - .05).tilt + .05) lurched = true;
  assert.ok(lurched);
  for (let t = .5; t < .8; t += .01) assert.ok(ringPose(0, t + .01).tilt <= ringPose(0, t).tilt + 1e-9);
});

test('a calm starts an effect that is cleaned up', () => {
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}}; this.rotation = {set() {}}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createCalmClear(THREE, {add() {}, remove() {}});
  fx.message('You feel less confused now.', 1, 2);
  assert.equal(fx.active, 1);
  fx.update(CALM.total + .1);
  assert.equal(fx.active, 0);
});
