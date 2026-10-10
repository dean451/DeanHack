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

test('a dart shivers faster than an arrow, and the arrow sags as it settles', () => {
  const crossings = k => { let n = 0, prev = 0; for (let h = .002; h < .3; h += .002) { const v = shaftPose(k, SHOT.flight + h).tilt; if (prev * v < 0) n++; prev = v; } return n; };
  assert.ok(crossings('dart') > crossings('arrow'));
  let sum = 0, n = 0; for (let h = .1; h < .5; h += .001) { sum += shaftPose('arrow', SHOT.flight + h).tilt; n++; }
  assert.ok(sum / n < 0, 'the shiver settles below level');
});

test('the buried shaft gives one late jerk after the shiver has died', () => {
  for (const k of ['arrow', 'dart']) {
    const peak = (a, b) => { let m = 0; for (let h = a; h < b; h += .002) m = Math.max(m, Math.abs(shaftPose(k, SHOT.flight + h).tilt)); return m; };
    assert.ok(peak(.31, .37) > .03, k + ' jerks late');
    assert.ok(peak(.5, .52) < .03, k + ' is still again');
    for (let t = 0; t < SHOT.total; t += .005) assert.ok(Math.abs(shaftPose(k, t).tilt) <= .35);
  }
  assert.equal(shaftPose('arrow', SHOT.total).alpha, 0);
});

test('the streak flickers as it fades but stays within its envelope', () => {
  const end = SHOT.flight * 2.5; let min = 1, max = 0;
  for (let t = .001; t < end; t += .001) { const env = .35 * (1 - t / end), a = streakPose('dart', t).alpha; assert.ok(a <= env + 1e-9 && a >= env * .75 - 1e-9, String(t)); if (t < end / 2) { min = Math.min(min, a / env); max = Math.max(max, a / env); } }
  assert.ok(max - min > .1);
  assert.equal(streakPose('dart', end).alpha, 0);
});

test('a landed arrow is driven a hair deeper, a dart is not, and both settle where they were', () => {
  const x = (k, h) => shaftPose(k, SHOT.flight + h).x, tail = (k, h) => -.04 * Math.exp(-h * 30);
  let most = 0;
  for (let h = 0; h <= .1; h += .002) { most = Math.max(most, x('arrow', h) - tail('arrow', h)); assert.ok(Math.abs(x('dart', h) - tail('dart', h)) < 1e-12); }
  assert.ok(most > .01 && most <= .015 + 1e-9);
  assert.ok(Math.abs(x('arrow', .06) - tail('arrow', .06)) < 1e-9);
});

test('a dart wobbles in flight, an arrow flies true, both land level', () => {
  const t = SHOT.flight * .5;
  assert.ok(Math.abs(shaftPose('dart', t).tilt) > .03, 'wobble');
  assert.equal(shaftPose('arrow', t).tilt, 0);
  for (let s = 0; s < SHOT.flight; s += .002) assert.ok(Math.abs(shaftPose('dart', s).tilt) <= .12 + 1e-9);
  assert.equal(shaftPose('dart', SHOT.total).tilt, 0);
});
