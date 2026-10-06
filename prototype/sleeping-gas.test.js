import test from 'node:test';
import assert from 'node:assert/strict';
import {puffPose, isSleepingGasMessage, createSleepingGas, PENDING_WAIT, GAS} from './sleeping-gas.js';

test('only the sleeping gas message triggers it', () => {
  assert.ok(isSleepingGasMessage('A cloud of gas puts you to sleep!'));
  for (const t of ['A board beneath you squeaks loudly.', 'You are enveloped in a cloud of gas!', null]) assert.ok(!isSleepingGasMessage(t), String(t));
});

test('every puff starts and ends invisible', () => {
  for (const t of [0, GAS.total]) for (let i = 0; i < GAS.puffs; i++) assert.equal(puffPose(i, t).alpha, 0);
});

test('puffs billow up, then droop below their peak, staying in bounds', () => {
  for (let i = 0; i < GAS.puffs; i++) {
    let top = 0, topT = 0, last = null;
    for (let t = 0; t <= GAS.total; t += .005) {
      const p = puffPose(i, t);
      assert.ok(p.alpha >= 0 && p.alpha <= .5 + 1e-9 && p.y >= -.1 && p.y <= .75 && Math.hypot(p.x, p.z) <= .45 && p.size <= .24, `${i} ${t}`);
      if (p.alpha > .01) { if (p.y > top) { top = p.y; topT = t; } last = p; }
    }
    assert.ok(top > .3, String(i));
    assert.ok(last.y < top - .2 && topT < GAS.total * .7, `${i} droops after the peak`);
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createSleepingGas(THREE, {add() {}, remove() {}});
  fx.message('A cloud of gas puts you to sleep!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(GAS.total + .1);
  assert.equal(fx.active, 0);
  fx.message('A cloud of gas puts you to sleep!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});
