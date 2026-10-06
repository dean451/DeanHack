import test from 'node:test';
import assert from 'node:assert/strict';
import {dropPose, fleckPose, isRustTrapMessage, createRustTrap, PENDING_WAIT, RUST} from './rust-trap.js';

test('only the hero being soaked triggers it', () => {
  for (const t of ['A gush of water hits you!', 'A gush of water hits your head!', 'A gush of water hits your left arm!']) assert.ok(isRustTrapMessage(t), t);
  for (const t of ['A gush of water hits the newt!', 'A board beneath you squeaks loudly.', null]) assert.ok(!isRustTrapMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, RUST.total]) {
    for (let i = 0; i < RUST.drops; i++) assert.equal(dropPose(i, t).alpha, 0);
    for (let i = 0; i < RUST.flecks; i++) assert.equal(fleckPose(i, t).alpha, 0);
  }
});

test('droplets stream in from the side, then splash low and stay in bounds', () => {
  for (let i = 0; i < RUST.drops; i++) {
    assert.ok(dropPose(i, i * .02 + .01).x < -1, String(i));
    let seen = false;
    for (let t = 0; t <= RUST.total; t += .005) {
      const p = dropPose(i, t);
      assert.ok(p.y >= .03 - 1e-9 && p.y <= .95 && p.x >= -RUST.from - 1e-9 && Math.hypot(p.x, p.z) <= RUST.from && p.alpha >= 0 && p.alpha <= .8 + 1e-9, `${i} ${t}`);
      if (p.alpha > 0) seen = true;
    }
    assert.ok(seen);
    assert.equal(dropPose(i, i * .02 + RUST.flight + .6).alpha, 0);
  }
});

test('rust flecks bloom after the strike, sink and stay low', () => {
  for (let i = 0; i < RUST.flecks; i++) {
    assert.equal(fleckPose(i, .1).alpha, 0);
    let top = 0, last = 1;
    for (let t = RUST.flight + .1; t <= RUST.total; t += .01) {
      const p = fleckPose(i, t);
      assert.ok(p.y >= .04 - 1e-9 && p.y <= .86 && Math.hypot(p.x, p.z) <= .45 && p.alpha >= 0 && p.alpha <= .85 + 1e-9, `${i} ${t}`);
      assert.ok(p.y <= last + 1e-9, `${i} ${t}`); last = p.y; top = Math.max(top, p.alpha);
    }
    assert.ok(top > .5, String(i));
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {set() {}}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createRustTrap(THREE, {add() {}, remove() {}});
  fx.message('A gush of water hits you!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(RUST.total + .1);
  assert.equal(fx.active, 0);
  fx.message('A gush of water hits your head!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});
