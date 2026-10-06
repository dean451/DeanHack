import test from 'node:test';
import assert from 'node:assert/strict';
import {motePose, ringPose, isAntiMagicMessage, createAntiMagic, PENDING_WAIT, ANTI} from './anti-magic.js';

test('the drain and the resisted drain both trigger it', () => {
  assert.ok(isAntiMagicMessage('You feel your magical energy drain away.'));
  assert.ok(isAntiMagicMessage('You feel your magical energy drain away!'));
  assert.ok(isAntiMagicMessage('You feel momentarily lethargic.'));
  for (const t of ['You feel tired.', 'You feel dizzy.', null]) assert.ok(!isAntiMagicMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, ANTI.total]) { assert.equal(ringPose(t).alpha, 0); for (let i = 0; i < ANTI.motes; i++) assert.equal(motePose(i, t).alpha, 0); }
});

test('motes are dragged down to the floor and stay in bounds', () => {
  for (let i = 0; i < ANTI.motes; i++) {
    let seen = 0, top = 0, lastY = Infinity;
    for (let t = .005; t < ANTI.drain; t += .005) {
      const p = motePose(i, t);
      if (p.alpha === 0) continue;
      assert.ok(Math.hypot(p.x, p.z) <= .42 + 1e-9 && p.y >= 0 && p.y <= 1.03 && p.alpha <= .85 + 1e-9, `${i} ${t}`);
      assert.ok(p.y <= lastY + 1e-9, `${i} ${t} rose`); lastY = p.y; seen = Math.max(seen, p.alpha); top = Math.max(top, p.y);
    }
    assert.ok(seen > .6 && top > .5, String(i));
    assert.ok(lastY < .2, String(i));
  }
});

test('the ring closes in, twitches and goes out', () => {
  let top = 0, small = Infinity;
  for (let t = .1; t < ANTI.drain; t += .005) { const p = ringPose(t); assert.ok(p.scale <= .7 && p.alpha <= .75 + 1e-9); top = Math.max(top, p.alpha); small = Math.min(small, p.scale); }
  assert.ok(top > .7 && small < .15);
  assert.ok(ringPose(ANTI.total - .01).alpha < .1);
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createAntiMagic(THREE, {add() {}, remove() {}});
  fx.message('You feel your magical energy drain away.', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(ANTI.total + .1);
  assert.equal(fx.active, 0);
  fx.message('You feel momentarily lethargic.', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});
