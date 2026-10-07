import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, motePose, isSqueakMessage, createSqueakyBoard, PENDING_WAIT, SQUEAK} from './squeaky-board.js';

test('only the squeak message triggers it', () => {
  assert.ok(isSqueakMessage('A board beneath you squeaks loudly.'));
  for (const t of ['You hear a door open.', 'A tower of flame bursts from the floor!', null]) assert.ok(!isSqueakMessage(t), String(t));
});

test('every part starts and ends invisible', () => {
  for (const t of [0, SQUEAK.total]) {
    for (let i = 0; i < SQUEAK.rings; i++) assert.equal(ringPose(i, t).alpha, 0);
    for (let i = 0; i < SQUEAK.motes; i++) assert.equal(motePose(i, t).alpha, 0);
  }
});

test('rings snap out one after another and stay in bounds', () => {
  for (let i = 0; i < SQUEAK.rings; i++) {
    let prev = 0, peak = 0;
    for (let t = 0; t <= SQUEAK.total; t += .005) {
      const p = ringPose(i, t);
      assert.ok(p.alpha >= 0 && p.alpha <= .75 + 1e-9 && p.radius >= .1 && p.radius <= .85, `${i} ${t}`);
      if (p.alpha > 0) { assert.ok(p.radius >= prev - 1e-9, `${i} ${t}`); prev = p.radius; }
      peak = Math.max(peak, p.alpha);
    }
    assert.ok(peak > .3, String(i));
  }
  assert.equal(ringPose(1, SQUEAK.gap * .5).alpha, 0);
  assert.ok(ringPose(0, .05).alpha > 0);
});

test('dust jolts up and settles back, staying low', () => {
  for (let i = 0; i < SQUEAK.motes; i++) {
    let top = 0;
    for (let t = 0; t <= SQUEAK.total; t += .005) {
      const p = motePose(i, t);
      assert.ok(p.y >= .03 - 1e-9 && p.y <= .4 && Math.hypot(p.x, p.z) < .4 && p.alpha >= 0 && p.alpha <= .55 + 1e-9, `${i} ${t}`);
      top = Math.max(top, p.y);
    }
    assert.ok(top > .15, String(i));
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createSqueakyBoard(THREE, {add() {}, remove() {}});
  fx.message('A board beneath you squeaks loudly.', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(SQUEAK.total + .1);
  assert.equal(fx.active, 0);
  added.length = 0;
  fx.message('A board beneath you squeaks loudly.', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [5, 5]);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the last mote hangs on, trembling, after the others have settled', () => {
  const last = SQUEAK.motes - 1;
  assert.equal(motePose(0, .65).alpha, 0);
  assert.ok(motePose(last, .65).alpha > .01);
  assert.equal(motePose(last, SQUEAK.total).alpha, 0);
});
