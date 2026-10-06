import test from 'node:test';
import assert from 'node:assert/strict';
import {columnPose, eyePose, ripplePose, isDemonMessage, DEMON} from './fountain-demon.js';

test('only the water demon message triggers it', () => {
  assert.ok(isDemonMessage('You unleash a water demon!'));
  for (const t of ['You attract a water nymph!', 'Water gushes forth from the overflowing fountain!', null]) assert.ok(!isDemonMessage(t), String(t));
});

test('column and eyes start and end at rest', () => {
  for (const t of [0, DEMON.total]) { const p = columnPose(t); assert.equal(p.height, 0); assert.equal(p.alpha, 0); assert.equal(p.sway, 0); assert.equal(eyePose(t).alpha, 0); }
});

test('column rises fast, holds, and slumps in bounds', () => {
  let prev = 0;
  for (let t = 0; t <= DEMON.rise; t += .01) { const h = columnPose(t).height; assert.ok(h >= prev - 1e-9, `rise ${t}`); prev = h; }
  assert.ok(columnPose(DEMON.rise).height > 1.29);
  for (let t = 0; t <= DEMON.total; t += .01) { const p = columnPose(t); assert.ok(p.height >= 0 && p.height <= 1.3 + 1e-9 && p.alpha <= .8 && p.shoulders >= 0 && p.shoulders <= 1 && Math.abs(p.sway) <= .12, String(t)); }
  prev = 2;
  for (let t = DEMON.rise + DEMON.hold; t <= DEMON.total; t += .01) { const h = columnPose(t).height; assert.ok(h <= prev + 1e-9, `sink ${t}`); prev = h; }
});

test('eyes open late, flicker, and shut before the slump', () => {
  assert.equal(eyePose(.5).alpha, 0);
  assert.ok(eyePose(1.4).alpha > .99);
  assert.ok(eyePose(1.65).alpha < .4);
  assert.equal(eyePose(DEMON.rise + DEMON.hold + .1).alpha, 0);
});

test('the slump sends out two rings, the second late, in bounds and at rest at both ends', () => {
  for (const t of [0, DEMON.total]) { const r = ripplePose(t); assert.equal(r.first.alpha, 0); assert.equal(r.second.alpha, 0); }
  let firstAt = null, secondAt = null;
  for (let t = 0; t <= DEMON.total; t += .005) {
    const r = ripplePose(t);
    for (const q of [r.first, r.second]) assert.ok(q.alpha >= 0 && q.alpha <= .5 && q.radius > 0 && q.radius <= 1, String(t));
    if (r.first.alpha > 0 && firstAt === null) firstAt = t;
    if (r.second.alpha > 0 && secondAt === null) secondAt = t;
  }
  assert.ok(firstAt >= DEMON.rise + DEMON.hold && secondAt > firstAt);
});
