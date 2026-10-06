import test from 'node:test';
import assert from 'node:assert/strict';
import {motePose, ringPose, isPolyTrapMessage, createPolyTrap, PENDING_WAIT, POLY} from './poly-trap.js';

test('only the hero\'s own change triggers it', () => {
  assert.ok(isPolyTrapMessage('You feel a change coming over you.'));
  for (const t of ['The newt turns into a rat!', 'You feel dizzy.', null]) assert.ok(!isPolyTrapMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, POLY.total]) { assert.equal(ringPose(t).alpha, 0); for (let i = 0; i < POLY.motes; i++) assert.equal(motePose(i, t).alpha, 0); }
});

test('motes are drawn inward, stutter on the way and stay in bounds', () => {
  for (let i = 0; i < POLY.motes; i++) {
    let seen = 0, reversed = 0, last = Infinity;
    for (let t = .01; t < POLY.crush; t += .005) {
      const p = motePose(i, t), r = Math.hypot(p.x, p.z);
      assert.ok(r <= .76 && p.y >= .5 && p.y <= 1.2 && p.alpha >= 0 && p.alpha <= .85 + 1e-9, `${i} ${t}`);
      if (r > last + 1e-9) reversed++; last = r; seen = Math.max(seen, p.alpha);
    }
    assert.ok(seen > .6 && reversed > 0, String(i));
    assert.ok(Math.hypot(motePose(i, .02).x, motePose(i, .02).z) > .5);
  }
});

test('the ring snaps outward after the crush and fades', () => {
  assert.equal(ringPose(POLY.crush - .01).alpha, 0);
  let last = 0, top = 0;
  for (let t = POLY.crush + .001; t < POLY.total; t += .005) { const p = ringPose(t); assert.ok(p.scale >= last && p.scale <= .65 + 1e-9 && p.alpha >= 0 && p.alpha <= .8 + 1e-9); last = p.scale; top = Math.max(top, p.alpha); }
  assert.ok(top > .7);
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createPolyTrap(THREE, {add() {}, remove() {}});
  fx.message('You feel a change coming over you.', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(POLY.total + .1);
  assert.equal(fx.active, 0);
  fx.message('You feel a change coming over you.', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});
