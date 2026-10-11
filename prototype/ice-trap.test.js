import test from 'node:test';
import assert from 'node:assert/strict';
import {flashPose, puffPose, frostPose, shardPose, isIceTrapMessage, createIceTrap, PENDING_WAIT, ICE} from './ice-trap.js';

test('only the freezing cloud message triggers it', () => {
  assert.ok(isIceTrapMessage('A freezing cloud shoots up from the floor!'));
  for (const t of ['A tower of flame bursts from the floor!', 'You are uninjured.', null]) assert.ok(!isIceTrapMessage(t), String(t));
});

test('every part starts and ends invisible and stays in bounds', () => {
  for (const t of [0, ICE.total]) {
    assert.equal(flashPose(t).alpha, 0); assert.equal(frostPose(t).alpha, 0);
    for (let i = 0; i < ICE.puffs; i++) assert.equal(puffPose(i, t).alpha, 0);
    for (let i = 0; i < ICE.shards; i++) assert.equal(shardPose(i, t).alpha, 0);
  }
  for (let t = 0; t <= ICE.total; t += .01) {
    const f = frostPose(t); assert.ok(f.radius <= .67 + 1e-9 && f.alpha <= .6 + 1e-9, String(t));
    for (let i = 0; i < ICE.puffs; i++) { const p = puffPose(i, t); assert.ok(p.y <= 1.3 && p.alpha <= .55 + 1e-9 && Math.hypot(p.x, p.z) <= .11, `${i} ${t}`); }
    for (let i = 0; i < ICE.shards; i++) { const p = shardPose(i, t); assert.ok(p.alpha >= 0 && p.alpha <= .9 + 1e-9 && p.y <= 1.2 && Math.hypot(p.x, p.z) <= .7, `${i} ${t}`); }
  }
});

test('the flash comes first', () => {
  assert.ok(flashPose(.02).alpha > .5 && flashPose(ICE.flash).alpha === 0);
});

test('the frost ring stalls a breath mid-spread, then goes on', () => {
  assert.ok(Math.abs(frostPose(.5).radius - frostPose(.36).radius) < 1e-9, 'stalled');
  assert.ok(frostPose(.3).radius < frostPose(.36).radius && frostPose(.8).radius > frostPose(.5).radius);
});

test('the last shard hangs in the air long after the rest have fallen, then drops', () => {
  const last = ICE.shards - 1;
  assert.equal(shardPose(0, 1.2).alpha, 0, 'the others are down');
  assert.ok(shardPose(last, .9).alpha > 0 && shardPose(last, .9).y > .4, 'hanging');
  assert.ok(shardPose(last, 1.2).y < shardPose(last, .9).y, 'dropping');
  assert.equal(shardPose(last, ICE.total).alpha, 0);
});

test('the cloud waits for the next frame, lands on the trap square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {x: 0, set() {}}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createIceTrap(THREE, {add() {}, remove() {}});
  fx.message('A freezing cloud shoots up from the floor!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [2, 1]);
  fx.clear(); added.length = 0;
  fx.message('A freezing cloud shoots up from the floor!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [5, 5]);
  fx.update(ICE.total + .1); assert.equal(fx.active, 0);
});
