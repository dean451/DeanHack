import test from 'node:test';
import assert from 'node:assert/strict';
import {shaftPose, streakPose, shotKind, createDartTrap, PENDING_WAIT, SHOT} from './dart-trap.js';

test('only the arrow and dart messages trigger it', () => {
  assert.equal(shotKind('An arrow shoots out at you!'), 'arrow');
  assert.equal(shotKind('A little dart shoots out at you!'), 'dart');
  for (const t of ['You are hit by an arrow.', 'A board beneath you squeaks loudly.', null]) assert.equal(shotKind(t), null, String(t));
});

test('every part starts and ends invisible', () => {
  for (const k of ['arrow', 'dart']) for (const t of [0, SHOT.total]) {
    assert.equal(shaftPose(k, t).alpha, 0);
    assert.equal(streakPose(k, t).alpha, 0);
  }
});

test('the shaft streaks in, lands and quivers, staying in bounds', () => {
  for (const k of ['arrow', 'dart']) {
    let prev = -Infinity;
    for (let t = .001; t <= SHOT.flight; t += .001) { const x = shaftPose(k, t).x; assert.ok(x >= prev - 1e-9 && x <= 0, `${k} ${t}`); prev = x; }
    assert.ok(shaftPose(k, .001).x < -SHOT[k].from * .9);
    let swing = 0;
    for (let t = SHOT.flight; t < SHOT.total; t += .002) {
      const p = shaftPose(k, t);
      assert.ok(p.alpha >= 0 && p.alpha <= 1 && Math.abs(p.tilt) <= .35 && p.x >= -SHOT[k].from && p.x <= 0, `${k} ${t}`);
      swing = Math.max(swing, Math.abs(p.tilt));
    }
    assert.ok(swing > .1, k);
    assert.ok(Math.abs(shaftPose(k, SHOT.flight + .5).tilt) < .02);
  }
});

test('the streak is bright at the strike and gone as the shaft lands', () => {
  for (const k of ['arrow', 'dart']) {
    assert.ok(streakPose(k, .01).alpha > .25 && streakPose(k, .01).alpha <= .35);
    assert.equal(streakPose(k, SHOT.flight * 2.5).alpha, 0);
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createDartTrap(THREE, {add() {}, remove() {}});
  fx.message('An arrow shoots out at you!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.ok(added.some(([x, z]) => x === 2 && z === 1));
  fx.update(SHOT.total + .1);
  assert.equal(fx.active, 0);
  fx.message('A little dart shoots out at you!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});
