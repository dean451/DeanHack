import test from 'node:test';
import assert from 'node:assert/strict';
import {flashPose, ringPose, debrisPose, smokePose, isLandMineMessage, createLandMine, PENDING_WAIT, MINE} from './land-mine.js';

test('only the land mine blast message triggers it', () => {
  assert.ok(isLandMineMessage('KAABLAMM!!!  You triggered a land mine!'));
  for (const t of ['A board beneath you squeaks loudly.', 'You find a land mine.', null]) assert.ok(!isLandMineMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, MINE.total]) {
    assert.equal(flashPose(t).alpha, 0);
    assert.equal(ringPose(t).alpha, 0);
    assert.equal(smokePose(t).alpha, 0);
    for (let i = 0; i < MINE.debris; i++) assert.equal(debrisPose(i, t).alpha, 0);
  }
});

test('the flash is brief and bright, the ring spreads, the smoke outlasts the flash', () => {
  assert.ok(flashPose(.01).alpha > .9);
  assert.equal(flashPose(.3).alpha, 0);
  assert.ok(ringPose(.4).radius > ringPose(.1).radius);
  assert.ok(smokePose(.9).alpha > .1 && smokePose(.9).y > smokePose(.2).y);
  for (let t = 0; t <= MINE.total; t += .005) {
    for (const p of [flashPose(t), ringPose(t), smokePose(t)]) assert.ok(p.alpha >= 0 && p.alpha <= 1, String(t));
    assert.ok(smokePose(t).y <= 1.1 && ringPose(t).radius <= 1.2 + 1e-9);
  }
});

test('debris is thrown up, falls back to the floor and stays in bounds', () => {
  for (let i = 0; i < MINE.debris; i++) {
    let top = 0;
    for (let t = 0; t <= MINE.total; t += .005) {
      const p = debrisPose(i, t);
      assert.ok(p.y >= .03 - 1e-9 && p.y <= 1.5 && Math.hypot(p.x, p.z) <= 1.25 && p.alpha >= 0 && p.alpha <= .9 + 1e-9, `${i} ${t}`);
      top = Math.max(top, p.y);
    }
    assert.ok(top > .3, String(i));
    assert.equal(debrisPose(i, 1.0).y, .03);
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {set() {}}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createLandMine(THREE, {add() {}, remove() {}});
  fx.message('KAABLAMM!!!  You triggered a land mine!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(MINE.total + .1);
  assert.equal(fx.active, 0);
  fx.message('KAABLAMM!!!  You triggered a land mine!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});
