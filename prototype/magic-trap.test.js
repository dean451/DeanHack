import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, gritPose, isMagicTrapMessage, isPackShakeMessage, isTiredMessage, TIRED_PACE, createMagicTrap, PENDING_WAIT, MAGIC} from './magic-trap.js';

test('only the roar triggers it', () => {
  assert.ok(isMagicTrapMessage('You hear a deafening roar!'));
  for (const t of ['You hear distant howling.', 'You are momentarily blinded by a flash of light!', null]) assert.ok(!isMagicTrapMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, MAGIC.total]) {
    for (let i = 0; i < MAGIC.rings; i++) assert.equal(ringPose(i, t).alpha, 0);
    for (let i = 0; i < MAGIC.grit; i++) assert.equal(gritPose(i, t).alpha, 0);
  }
});

test('rings slam out in turn, grow, fade and stay in bounds', () => {
  let lastStart = -1;
  for (let i = 0; i < MAGIC.rings; i++) {
    let last = 0, top = 0, start = null;
    for (let t = 0; t < MAGIC.total; t += .005) {
      const p = ringPose(i, t);
      assert.ok((p.alpha === 0 || p.scale >= last - 1e-9) && p.scale <= 1.001 && p.alpha >= 0 && p.alpha <= .85 + 1e-9 && p.y >= 0 && p.y <= .2, `${i} ${t}`);
      if (p.alpha > .01 && start === null) start = t;
      last = p.scale; top = Math.max(top, p.alpha);
    }
    assert.ok(start > lastStart && top > .4, String(i)); lastStart = start;
  }
});

test('grit is thrown up and falls back to the floor', () => {
  for (let i = 0; i < MAGIC.grit; i++) {
    let peak = 0;
    for (let t = .005; t < MAGIC.total; t += .005) { const p = gritPose(i, t); assert.ok(p.y >= 0 && p.y <= 1.2 && Math.hypot(p.x, p.z) <= .5 + 1e-9 && p.alpha <= .8 + 1e-9); peak = Math.max(peak, p.y); }
    assert.ok(peak > .35);
    assert.ok(gritPose(i, MAGIC.total - .005).y < .05);
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createMagicTrap(THREE, {add() {}, remove() {}});
  fx.message('You hear a deafening roar!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(MAGIC.total + .1);
  assert.equal(fx.active, 0);
  fx.message('You hear a deafening roar!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the last mote stalls mid-air, trembling, while the rest fall', () => {
  const stray = MAGIC.grit - 1, y = (i, t) => gritPose(i, t).y;
  assert.ok(Math.abs(y(stray, .62 * MAGIC.total) - y(stray, .4 * MAGIC.total)) < .05 && y(stray, .5 * MAGIC.total) > .4, 'hangs');
  assert.ok(y(0, .9 * MAGIC.total) < .5 * y(0, .5 * MAGIC.total) && y(stray, .9 * MAGIC.total) > y(0, .9 * MAGIC.total) + .1, 'the others have fallen first');
  let xs = new Set();
  for (let t = .45; t < .6; t += .003) xs.add(gritPose(stray, t).x.toFixed(4));
  assert.ok(xs.size > 5, 'it trembles');
});

test('a shaking pack plays a quieter version at once, on the hero\'s square', () => {
  assert.ok(isPackShakeMessage('Your pack shakes violently!') && !isPackShakeMessage('You hear a deafening roar!') && !isMagicTrapMessage('Your pack shakes violently!'));
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createMagicTrap(THREE, {add() {}, remove() {}});
  fx.message('Your pack shakes violently!', 5, 6);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [5, 6]);
  fx.update(.5); fx.update(MAGIC.total); assert.equal(fx.active, 0);
});

test('feeling tired plays a dim, slow, low version that still ends at rest', () => {
  assert.ok(isTiredMessage('You feel tired.') && !isTiredMessage('You feel a strange vibration.') && !isMagicTrapMessage('You feel tired.'));
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createMagicTrap(THREE, {add() {}, remove() {}});
  fx.message('You feel tired.', 3, 4);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [3, 4]);
  fx.update(MAGIC.total); assert.equal(fx.active, 1, 'slower than the roar');
  fx.update(MAGIC.total / TIRED_PACE); assert.equal(fx.active, 0);
});
