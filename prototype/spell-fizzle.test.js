import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, sparkPose, isSpellFailMessage, createSpellFizzle, FIZZLE} from './spell-fizzle.js';

test('only the cast failure message triggers it', () => {
  assert.ok(isSpellFailMessage('You fail to cast the spell correctly.'));
  for (const t of ['You cast the spell.', 'You feel a strange vibration.', null]) assert.ok(!isSpellFailMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, FIZZLE.total]) {
    assert.equal(ringPose(t).alpha, 0);
    for (let i = 0; i < FIZZLE.sparks; i++) assert.equal(sparkPose(i, t).alpha, 0);
  }
});

test('the ring draws in, then bursts out and thins, in bounds', () => {
  let min = 1, max = 0;
  for (let t = .001; t < FIZZLE.total; t += .005) { const p = ringPose(t); assert.ok(p.scale > 0 && p.scale <= .81 && p.alpha >= 0 && p.alpha <= .7 + 1e-9, String(t)); min = Math.min(min, p.scale); max = Math.max(max, p.scale); }
  assert.ok(min < .2 && max > .7);
  assert.ok(ringPose(.5).alpha > ringPose(.95).alpha);
});

test('the draw-in stutters: the ring gutters on some beats and never reverses', () => {
  let dips = 0, last = .6;
  for (let t = .09; t < .35; t += .005) { const p = ringPose(t); if (p.alpha < .4) dips++; assert.ok(p.scale <= last + 1e-9, String(t)); last = p.scale; }
  assert.ok(dips > 10);
  assert.ok(ringPose(.349).scale < .2);
});

test('sparks arc up and slump back, in bounds', () => {
  for (let i = 0; i < FIZZLE.sparks; i++) {
    let peak = 0;
    for (let t = .385; t < FIZZLE.total; t += .005) { const p = sparkPose(i, t); assert.ok(p.y >= 0 && p.y <= .8 && Math.hypot(p.x, p.z) <= .45 && p.alpha <= .85 + 1e-9); peak = Math.max(peak, p.y); }
    assert.ok(peak > .3); assert.ok(sparkPose(i, FIZZLE.total - .005).y < .3);
  }
});

test('it plays on the hero\'s square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createSpellFizzle(THREE, {add() {}, remove() {}});
  fx.message('You fail to cast the spell correctly.', 3, 4);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [3, 4]);
  fx.update(FIZZLE.total + .1); assert.equal(fx.active, 0);
  fx.message('You fail to cast the spell correctly.', 0, 0); fx.clear(); assert.equal(fx.active, 0);
});

test('the thinning ring coughs once, blinking out and returning', () => {
  const a = t => ringPose(t).alpha;
  assert.ok(a(.63) < .35 * a(.58) && a(.7) > .6 * a(.58) * .5, 'dim for a beat');
  assert.ok(a(.68) > 2 * a(.63), 'then back');
  let dips = 0;
  for (let t = .4; t < .95; t += .005) if (a(t + .005) > a(t) + .02) dips++;
  assert.ok(dips >= 1 && dips <= 2, 'one return only');
});
