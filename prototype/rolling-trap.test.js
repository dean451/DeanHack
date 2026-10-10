import test from 'node:test';
import assert from 'node:assert/strict';
import {cordPose, sparkPose, rumblePose, dustPose, isRollingTrapMessage, createRollingTrap, PENDING_WAIT, ROLL} from './rolling-trap.js';

test('only the click triggers it', () => {
  assert.ok(isRollingTrapMessage('Click!  You trigger a rolling boulder trap!') && isRollingTrapMessage('Click! You trigger a rolling boulder trap!'));
  for (const t of ['Fortunately for you, no boulder was released.', 'You trigger a rolling boulder trap!', null]) assert.ok(!isRollingTrapMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, ROLL.total]) {
    assert.equal(cordPose(t).alpha, 0); assert.equal(sparkPose(t).alpha, 0); assert.equal(rumblePose(t).alpha, 0);
    for (let i = 0; i < ROLL.motes; i++) assert.equal(dustPose(i, t).alpha, 0);
  }
});

test('the cord goes taut, whips and dies away in bounds', () => {
  assert.equal(cordPose(.03).sag, 0);
  let top = 0, flips = 0, last = 0;
  for (let t = 0; t < ROLL.total; t += .003) {
    const p = cordPose(t); assert.ok(p.alpha >= 0 && p.alpha <= .8 + 1e-9 && Math.abs(p.sag) <= .16, String(t));
    top = Math.max(top, Math.abs(p.sag)); if (p.sag * last < 0) flips++; if (p.sag) last = p.sag;
  }
  assert.ok(top > .05 && flips >= 2, `${top} ${flips}`);
});

test('the spark flares once and the rumble closes in two beats', () => {
  assert.ok(sparkPose(.06).alpha > .3 && sparkPose(.2).alpha === 0);
  let prev = .9, peak = 0;
  for (let t = 0; t <= ROLL.total; t += .004) {
    const p = rumblePose(t); assert.ok(p.radius <= .9 + 1e-9 && p.radius >= .15 - 1e-9 && p.alpha >= 0 && p.alpha <= .45 + 1e-9, String(t));
    if (p.alpha > 0) { assert.ok(p.radius <= prev + 1e-9, String(t)); prev = p.radius; }
    peak = Math.max(peak, p.alpha);
  }
  assert.ok(peak > .3);
  assert.ok(rumblePose(.55).alpha < rumblePose(.4).alpha * .6, 'the held beat');
});

test('dust falls from the ceiling to the floor and stays low', () => {
  for (let i = 0; i < ROLL.motes; i++) {
    let top = 0, seenLow = false;
    for (let t = 0; t <= ROLL.total; t += .004) {
      const p = dustPose(i, t); assert.ok(p.y >= 0 && p.y <= 1.1 + 1e-9 && Math.hypot(p.x, p.z) < .5 && p.alpha <= .6 + 1e-9, `${i} ${t}`);
      if (p.alpha > 0) { top = Math.max(top, p.y); if (p.y < .05) seenLow = true; }
    }
    assert.ok(top > .8 && seenLow, String(i));
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createRollingTrap(THREE, {add() {}, remove() {}});
  fx.message('Click!  You trigger a rolling boulder trap!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [2, 1]);
  fx.update(ROLL.total + .1); assert.equal(fx.active, 0);
  fx.message('Click!  You trigger a rolling boulder trap!', 5, 5);
  fx.update(PENDING_WAIT + .01); assert.equal(fx.active, 1);
  fx.clear(); assert.equal(fx.active, 0);
});
