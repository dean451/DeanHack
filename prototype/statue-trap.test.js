import test from 'node:test';
import assert from 'node:assert/strict';
import {shardPose, dustPose, glintPose, isStatueTrapMessage, createStatueTrap, PENDING_WAIT, STATUE} from './statue-trap.js';

test('the statue coming to life triggers it', () => {
  assert.ok(isStatueTrapMessage('The statue comes to life!'));
  for (const t of ['You see here a statue of a gnome.', 'The statue is a trap.', null]) assert.ok(!isStatueTrapMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, STATUE.total]) {
    assert.equal(dustPose(t).alpha, 0); assert.equal(glintPose(t).alpha, 0);
    for (let i = 0; i < STATUE.shards; i++) assert.equal(shardPose(i, t).alpha, 0, `${i} ${t}`);
  }
});

test('shards are thrown up and out, land on the floor and stay in bounds', () => {
  for (let i = 0; i < STATUE.shards; i++) {
    let top = 0, seen = 0;
    for (let t = .005; t < STATUE.total; t += .005) {
      const p = shardPose(i, t);
      assert.ok(Math.hypot(p.x, p.z) <= .55 && p.y >= 0 && p.y <= .9 && p.alpha <= .9 + 1e-9, `${i} ${t} ${p.y}`);
      top = Math.max(top, p.y); seen = Math.max(seen, p.alpha);
    }
    assert.ok(top > .3 && seen > .8, String(i));
    assert.ok(shardPose(i, STATUE.total - .5).y < .03, `${i} still airborne late`);
  }
});

test('dust rolls out and the glint flashes, both bounded', () => {
  let d = 0, g = 0;
  for (let t = .002; t < .9; t += .002) { const p = dustPose(t); assert.ok(p.scale <= .8 && p.alpha <= .5 + 1e-9); d = Math.max(d, p.alpha); }
  for (let t = .002; t < .35; t += .002) { const p = glintPose(t); assert.ok(p.scale <= .2 && p.alpha <= .9 + 1e-9); g = Math.max(g, p.alpha); }
  assert.ok(d > .4 && g > .8);
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {set() {}}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createStatueTrap(THREE, {add() {}, remove() {}});
  fx.message('The statue comes to life!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(STATUE.total + .1);
  assert.equal(fx.active, 0);
  fx.message('The statue comes to life!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the first shard rocks back once long after it has come to rest', () => {
  const air = STATUE.flight, rest = shardPose(0, air + .4).spin;
  assert.ok(Math.abs(shardPose(0, air + .575).spin - rest) > .2, 'it rocks');
  assert.ok(Math.abs(shardPose(0, air + .75).spin - rest) < 1e-6, 'it lies still again');
  assert.equal(shardPose(0, STATUE.total).alpha, 0);
  assert.equal(shardPose(1, air + .575).spin, shardPose(1, air + .75).spin);
});
