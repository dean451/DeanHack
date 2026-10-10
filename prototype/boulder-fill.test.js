import test from 'node:test';
import assert from 'node:assert/strict';
import {mouthPose, gritRingPose, chunkPose, isBoulderFillMessage, createBoulderFill, PENDING_WAIT, FILL} from './boulder-fill.js';

test('only a boulder plugging a pit or hole triggers it', () => {
  assert.ok(isBoulderFillMessage('The boulder fills a pit.'));
  assert.ok(isBoulderFillMessage('The boulder falls into and plugs a hole in the floor!'));
  for (const t of ['You try to move the boulder, but in vain.', 'With great effort you move the boulder.', null]) assert.ok(!isBoulderFillMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, FILL.total]) {
    assert.equal(mouthPose(t).alpha, 0); assert.equal(gritRingPose(t).alpha, 0);
    for (let i = 0; i < FILL.chunks; i++) assert.equal(chunkPose(i, t).alpha, 0);
  }
});

test('the pit mouth only ever shrinks, and is crushed shut', () => {
  let last = Infinity;
  for (let t = .001; t < FILL.total; t += .005) { const p = mouthPose(t); assert.ok(p.scale <= last + 1e-9 && p.scale <= .45 && p.alpha <= .9 + 1e-9); last = p.scale; }
  assert.ok(mouthPose(.3).scale < .05);
});

test('the grit ring grows and fades; chunks hop, stay in bounds and rest on the floor', () => {
  let last = 0;
  for (let t = 0; t < FILL.total; t += .005) { const p = gritRingPose(t); assert.ok(p.scale <= .75 + 1e-9 && p.alpha <= .7 + 1e-9); if (p.alpha) { assert.ok(p.scale >= last - 1e-9); last = p.scale; } }
  for (let i = 0; i < FILL.chunks; i++) {
    let peak = 0;
    for (let t = .001; t < FILL.total; t += .005) { const p = chunkPose(i, t); assert.ok(p.y >= 0 && p.y <= .4 && Math.hypot(p.x, p.z) <= .4); peak = Math.max(peak, p.y); }
    assert.ok(peak > .1); assert.equal(chunkPose(i, FILL.total - .005).y, 0);
  }
});

test('it lands one square ahead of the hero on the next frame', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createBoulderFill(THREE, {add() {}, remove() {}});
  fx.message('The boulder fills a pit.', 1, 1, 0);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.ok(Math.abs(added[0][0] - 2) < 1e-9 && Math.abs(added[0][1] - 2) < 1e-9);
  fx.update(FILL.total + .1);
  assert.equal(fx.active, 0);
  fx.message('The boulder fills a pit.', 5, 5, 0);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('chunk 2 creeps back toward the hole once it lies down; the rest stay put', () => {
  const r = (i, t) => Math.hypot(chunkPose(i, t).x, chunkPose(i, t).z);
  assert.ok(r(2, 1.15) < r(2, .8) * .6);
  assert.ok(r(1, 1.15) > r(1, .8) * .95);
});
