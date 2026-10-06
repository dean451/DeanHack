import test from 'node:test';
import assert from 'node:assert/strict';
import {jawAngle, jawAlpha, sparkPose, isBearTrapMessage, createBearTrapSnap, PENDING_WAIT, SNAP} from './bear-trap-snap.js';

test('only the bear trap message triggers it', () => {
  assert.ok(isBearTrapMessage('A bear trap closes on your foot!'));
  for (const t of ['A board beneath you squeaks loudly.', 'You escape a bear trap.', null]) assert.ok(!isBearTrapMessage(t), String(t));
});

test('the jaws start open, slam shut, rebound and clamp', () => {
  assert.equal(jawAngle(0), SNAP.open);
  assert.ok(jawAngle(.09) < .01);
  assert.ok(jawAngle(.17) > .3, 'rebound kicks back open');
  assert.ok(jawAngle(.27) < .01);
  for (let t = 0; t <= SNAP.total; t += .002) { const a = jawAngle(t); assert.ok(a >= -.04 && a <= SNAP.open + 1e-9, String(t)); }
  assert.ok(Math.abs(jawAngle(SNAP.total)) < .01);
});

test('everything starts and ends invisible and stays in bounds', () => {
  for (const t of [0, SNAP.total]) {
    assert.equal(jawAlpha(t), 0);
    for (let i = 0; i < SNAP.sparks; i++) assert.equal(sparkPose(i, t).alpha, 0);
  }
  assert.ok(jawAlpha(.5) > .9);
  for (let i = 0; i < SNAP.sparks; i++) {
    let top = 0;
    for (let t = 0; t <= SNAP.total; t += .005) {
      const p = sparkPose(i, t);
      assert.ok(p.alpha >= 0 && p.alpha <= .9 + 1e-9 && Math.hypot(p.x, p.z) <= .33 && p.y >= -.15 && p.y <= .4, `${i} ${t}`);
      top = Math.max(top, p.y);
    }
    assert.ok(top > .15, String(i));
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createBearTrapSnap(THREE, {add() {}, remove() {}});
  fx.message('A bear trap closes on your foot!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.ok(added.some(([x, z]) => x === 2 && z === 1));
  fx.update(SNAP.total + .1);
  assert.equal(fx.active, 0);
  fx.message('A bear trap closes on your foot!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});
