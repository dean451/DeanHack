import test from 'node:test';
import assert from 'node:assert/strict';
import {rockPose, gritPose, isFallingRockMessage, createFallingRock, PENDING_WAIT, ROCK, LATE_PEBBLE} from './falling-rock.js';

test('only the falling rock message triggers it', () => {
  assert.ok(isFallingRockMessage('A trap door in the ceiling opens and a rock falls on your head!'));
  for (const t of ['A board beneath you squeaks loudly.', 'You are hit by a rock.', null]) assert.ok(!isFallingRockMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, ROCK.total]) {
    assert.equal(rockPose(t).alpha, 0);
    for (let i = 0; i < ROCK.grit; i++) assert.equal(gritPose(i, t).alpha, 0);
  }
});

test('the rock falls faster and faster, hops once and stays in bounds', () => {
  let prev = ROCK.height, prevDrop = 0;
  for (let t = .09; t <= .08 + ROCK.drop; t += .005) {
    const y = rockPose(t).y, drop = prev - y;
    assert.ok(y <= prev + 1e-9 && drop >= prevDrop - 1e-9, String(t));
    prev = y; prevDrop = drop;
  }
  let hopTop = 0;
  for (let t = 0; t <= ROCK.total; t += .005) {
    const p = rockPose(t);
    assert.ok(p.y >= .06 - 1e-9 && p.y <= ROCK.height + 1e-9 && p.alpha >= 0 && p.alpha <= 1, String(t));
    if (t > .08 + ROCK.drop) hopTop = Math.max(hopTop, p.y);
  }
  assert.ok(hopTop > .1);
});

test('grit jumps only after the impact and stays low', () => {
  for (let i = 0; i < ROCK.grit; i++) {
    assert.equal(gritPose(i, .2).alpha, 0);
    let top = 0;
    for (let t = 0; t <= ROCK.total; t += .005) {
      const p = gritPose(i, t);
      assert.ok(p.y >= .03 - 1e-9 && p.y <= .3 && Math.hypot(p.x, p.z) <= .45 && p.alpha >= 0 && p.alpha <= .6 + 1e-9, `${i} ${t}`);
      top = Math.max(top, p.y);
    }
    assert.ok(top > .1, String(i));
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {set() {}}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createFallingRock(THREE, {add() {}, remove() {}});
  fx.message('A trap door in the ceiling opens and a rock falls on your head!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(ROCK.total + .1);
  assert.equal(fx.active, 0);
  fx.message('A trap door in the ceiling opens and a rock falls on your head!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the last pebble trickles on after the others have settled', () => {
  const i = ROCK.grit - 1, t = .08 + ROCK.drop + .55;
  assert.ok(gritPose(i, t).alpha > 0 && gritPose(0, t).alpha === 0);
  assert.equal(gritPose(i, ROCK.total).alpha, 0);
});

test('after landing the rock rolls a short way and slows', () => {
  const land = .08 + ROCK.drop;
  assert.equal(rockPose(land).x, 0);
  let prev = 0, prevStep = Infinity;
  for (let t = land + .05; t <= land + .5; t += .05) {
    const x = rockPose(t).x, step = x - prev;
    assert.ok(x >= prev && x <= .12 + 1e-9 && step <= prevStep + 1e-9, String(t));
    prev = x; prevStep = step;
  }
  assert.ok(prev > .1);
});

test('the settled rock tips once more, then lies exactly still', () => {
  const spin = h => rockPose(.08 + ROCK.drop + h).spin;
  assert.ok(Math.abs(spin(.7) - spin(.3)) < 1e-9, 'still before and after the tip');
  assert.ok(spin(.475) - spin(.3) > .1, 'the tip');
});

test('one pebble ticks down late, after the rest have started', () => {
  const t = .08 + ROCK.drop + LATE_PEBBLE * .5;
  assert.equal(gritPose(1, t).alpha, 0);
  assert.ok(gritPose(0, t).alpha > 0);
  assert.ok(gritPose(1, t + LATE_PEBBLE).alpha > 0);
});

test('the falling rock swings off the vertical and is back on the mark at the floor', () => {
  let swing = 0;
  for (let t = .09; t < .08 + ROCK.drop; t += .005) swing = Math.max(swing, Math.abs(rockPose(t).x));
  assert.ok(swing > .015 && swing <= .04);
  assert.equal(rockPose(.08 + ROCK.drop).x, 0);
});
