import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, dustPose, isThroneSitMessage, createThroneSit, SIT} from './throne-sit.js';

test('only sitting on a throne triggers it', () => {
  assert.ok(isThroneSitMessage('You sit on the throne.'));
  for (const t of ['You sit on the altar.', 'There is a throne here.', 'You feel very comfortable here.', null]) assert.ok(!isThroneSitMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, SIT.total]) {
    assert.equal(ringPose(t).alpha, 0);
    for (let i = 0; i < SIT.dust; i++) assert.equal(dustPose(i, t).alpha, 0);
  }
});

test('the ring settles onto the seat, holds with a tremor, then thins, in bounds', () => {
  let last = 2;
  for (let t = .001; t < .44; t += .005) { const p = ringPose(t); assert.ok(p.y <= last + 1e-9 && p.y >= .1, String(t)); last = p.y; }
  assert.ok(ringPose(.44).y < .2);
  let lo = 9, hi = -9;
  for (let t = .46; t < SIT.hold; t += .002) { const y = ringPose(t).y; lo = Math.min(lo, y); hi = Math.max(hi, y); }
  assert.ok(hi - lo > .01 && hi - lo < .05);
  for (let t = .001; t < SIT.total; t += .005) { const p = ringPose(t); assert.ok(p.alpha >= 0 && p.alpha <= .65 + 1e-9 && p.scale > .7 && p.scale < 1.25, String(t)); }
  assert.ok(ringPose(SIT.total - .01).alpha < ringPose(SIT.hold - .01).alpha);
});

test('dust drifts down, in bounds', () => {
  for (let i = 0; i < SIT.dust; i++) {
    let prev = 1;
    for (let t = .41; t < SIT.total; t += .005) { const p = dustPose(i, t); assert.ok(p.y >= 0 && p.y <= .5 && Math.hypot(p.x, p.z) <= .36 && p.alpha <= .6 + 1e-9); assert.ok(p.y <= prev + 1e-9); prev = p.y; }
  }
});

test('it plays on the hero\'s square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createThroneSit(THREE, {add() {}, remove() {}});
  fx.message('You sit on the throne.', 3, 4);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [3, 4]);
  fx.update(SIT.total + .1); assert.equal(fx.active, 0);
  fx.message('You sit on the throne.', 0, 0); fx.clear(); assert.equal(fx.active, 0);
});
