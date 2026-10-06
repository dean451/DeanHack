import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, streakPose, isThroneWrenchMessage, createThroneWrench, WRENCH} from './throne-wrench.js';

test('only the wrenching sensation triggers it', () => {
  assert.ok(isThroneWrenchMessage('You feel a wrenching sensation.'));
  for (const t of ['You feel threatened.', 'You sit on the throne.', null]) assert.ok(!isThroneWrenchMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, WRENCH.total]) {
    assert.equal(ringPose(t).alpha, 0);
    for (let i = 0; i < WRENCH.streaks; i++) assert.equal(streakPose(i, t).alpha, 0);
  }
});

test('the ring clenches in jerks, never smoothly, in bounds', () => {
  const s = t => ringPose(t).scale;
  assert.ok(s(.09) > s(.2) && s(.29) > s(.4) && s(.49) > s(.58));
  assert.ok(Math.abs(s(.28) - s(.26)) < .02 && Math.abs(s(.12) - s(.1)) > .02);
  for (let t = .001; t < WRENCH.total; t += .004) { const p = ringPose(t); assert.ok(p.scale >= .3 && p.scale <= 1.1 + 1e-9 && p.alpha >= 0 && p.alpha <= .75 + 1e-9, String(t)); }
});

test('streaks are dragged up taut then snap away, in bounds', () => {
  for (let i = 0; i < WRENCH.streaks; i++) {
    assert.ok(streakPose(i, .55).y > streakPose(i, .15).y);
    assert.ok(streakPose(i, .79).y > streakPose(i, .6).y + .2);
    for (let t = .06; t < WRENCH.total; t += .004) { const p = streakPose(i, t); assert.ok(p.y >= 0 && p.y <= 2.7 && Math.hypot(p.x, p.z) <= .7 && p.alpha >= 0 && p.alpha <= .6 + 1e-9, `${i} ${t}`); }
  }
});

test('it plays on the hero\'s square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createThroneWrench(THREE, {add() {}, remove() {}});
  fx.message('You feel a wrenching sensation.', 3, 4);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [3, 4]);
  fx.update(WRENCH.total + .1); assert.equal(fx.active, 0);
  fx.message('You feel a wrenching sensation.', 0, 0); fx.clear(); assert.equal(fx.active, 0);
});
