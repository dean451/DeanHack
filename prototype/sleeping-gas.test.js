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

test('the last puff jerks awake once before it slumps', () => {
  const y = t => puffPose(GAS.puffs - 1, t).y, start = (GAS.puffs - 1) % 3 * .08 + Math.floor((GAS.puffs - 1) / 3) * .05;
  const rises = []; for (let u = .6; u < .8; u += .005) rises.push(y(start + u * 1.6));
  assert.ok(rises.some((v, k) => k && v > rises[k - 1] + 1e-9), 'a rise during the droop');
  for (let t = 0; t < GAS.total; t += .01) assert.ok(puffPose(GAS.puffs - 1, t).y >= .05);
});

test('drooping puffs breathe slowly, swelling and slackening within bounds', () => {
  const sizes = []; for (let t = .9; t < 1.5; t += .01) sizes.push(puffPose(0, t).size);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) > .01);
  for (let t = 0; t < GAS.total; t += .01) { const s = puffPose(0, t).size; assert.ok(s >= .01 && s <= .26, String(t)); }
});

test('the middle puff snores once: a single swell, then back to its slow breath', () => {
  const start = 4 % 3 * .08 + Math.floor(4 / 3) * .05, at = u => puffPose(4, start + u * 1.6).size, base = u => (.09 + .14 * (u * u * (3 - 2 * u)));
  assert.ok(at(.65) > base(.65) * 1.08, 'swollen mid-snore');
  assert.ok(Math.abs(at(.5) / base(.5) - 1) <= .1 + 1e-9 && Math.abs(at(.9) / base(.9) - 1) <= .1 + 1e-9, 'normal either side');
  for (let t = 0; t < GAS.total; t += .01) assert.ok(puffPose(4, t).size <= .24, String(t));
});

test('the second puff rolls over sideways mid-sag and comes back', () => {
  const at = u => puffPose(1, .08 + u * 1.6).x;
  const spread = u => .12 + .3 * (x => x * x * (3 - 2 * x))(Math.min(1, u * 1.4));
  const roll = u => at(u) - Math.cos(2.4) * spread(u);
  assert.ok(roll(.65) > .07, 'the roll');
  assert.ok(Math.abs(roll(.4)) < 1e-9 && Math.abs(roll(.9)) < 1e-9, 'only mid-sag');
  for (let t = 0; t <= GAS.total; t += .01) assert.ok(Math.hypot(puffPose(1, t).x, puffPose(1, t).z) < .6, String(t));
});

test('the sixth puff sighs sideways once it has sunk, and only then', () => {
  const at = u => puffPose(6, .1 + u * 1.6).x;
  const spread = u => .12 + .3 * (x => x * x * (3 - 2 * x))(Math.min(1, u * 1.4));
  const sigh = u => at(u) - Math.cos(6 * 2.4) * spread(u);
  assert.ok(sigh(.79) > .06, 'the sigh');
  assert.ok(Math.abs(sigh(.5)) < 1e-9 && Math.abs(sigh(.95)) < 1e-9, 'only late');
  for (let t = 0; t <= GAS.total; t += .01) assert.ok(Math.hypot(puffPose(6, t).x, puffPose(6, t).z) < .6, String(t));
});
