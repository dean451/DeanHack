import test from 'node:test';
import assert from 'node:assert/strict';
import {dropPose, ringPose, isHealMessage, createPotionSip, SIP} from './potion-sip.js';

test('only the healing messages trigger it', () => {
  for (const t of ['You feel better.', 'You feel much better.', 'You feel completely healed.']) assert.ok(isHealMessage(t), t);
  for (const t of ['You feel worse.', 'You feel dizzy.', 'You hit the newt.', null]) assert.ok(!isHealMessage(t), String(t));
});

test('every part starts and ends hidden and stays in bounds', () => {
  for (const t of [0, SIP.total]) {
    assert.equal(ringPose(t).alpha, 0);
    for (let i = 0; i < SIP.drops; i++) assert.equal(dropPose(i, t).alpha, 0);
  }
  for (let t = 0; t <= SIP.total; t += .005) {
    for (let i = 0; i < SIP.drops; i++) {
      const p = dropPose(i, t);
      assert.ok(p.y >= 0 && p.y <= .8 && Math.hypot(p.x, p.z) <= .07 && p.alpha >= 0 && p.alpha <= 1, `${i} ${t}`);
    }
    const r = ringPose(t); assert.ok(r.scale > 0 && r.scale <= .5 && r.alpha >= 0 && r.alpha <= .45);
  }
});

test('the drops fall in jerks and the first one is late', () => {
  const ys = []; for (let t = .1; t < .4; t += .002) ys.push(dropPose(1, t).y);
  const steps = ys.slice(1).map((y, k) => ys[k] - y);
  assert.ok(steps.every(s => s >= -1e-9), 'never rises');
  assert.ok(Math.max(...steps) > 4 * (ys[0] - ys.at(-1)) / steps.length, 'has jolts');
  assert.equal(dropPose(0, .1).alpha, 0);
  assert.ok(dropPose(1, .1).alpha > 0);
});

test('a heal starts an effect that is cleaned up', () => {
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}}; this.rotation = {}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createPotionSip(THREE, {add() {}, remove() {}});
  fx.message('You feel better.', 1, 2);
  assert.equal(fx.active, 1);
  fx.update(SIP.total + .1);
  assert.equal(fx.active, 0);
});
