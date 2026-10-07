import test from 'node:test';
import assert from 'node:assert/strict';
import {motePose, flarePose, afterPose, isWishMessage, WISH} from './fountain-wish.js';

test('only the wish message triggers it', () => {
  assert.ok(isWishMessage('Grateful for his release, he grants you a wish!'));
  for (const t of ['You unleash a water demon!', 'Easy come, easy go.', null]) assert.ok(!isWishMessage(t), String(t));
});

test('motes and flare start and end invisible', () => {
  for (let i = 0; i < WISH.motes; i++) { assert.equal(motePose(i, 0).alpha, 0); assert.equal(motePose(i, WISH.total).alpha, 0); }
  assert.equal(flarePose(0).alpha, 0); assert.equal(flarePose(WISH.total).alpha, 0);
});

test('motes only move inward, in bounds', () => {
  for (let i = 0; i < WISH.motes; i++) {
    let prev = 2;
    for (let t = 0; t <= WISH.total; t += .01) { const p = motePose(i, t); assert.ok(p.r <= prev + 1e-9 && p.r >= 0 && p.r <= 1.1 && p.y > 0 && p.y < 1 && p.alpha <= .9 + 1e-9, `${i} ${t}`); prev = p.r; }
  }
});

test('the flare is brightest after the motes land and stays in bounds', () => {
  let peak = 0, at = 0;
  for (let t = 0; t <= WISH.total; t += .005) { const f = flarePose(t); assert.ok(f.alpha >= 0 && f.alpha <= 1 && f.size >= 0 && f.size <= .6, String(t)); if (f.alpha > peak) { peak = f.alpha; at = t; } }
  assert.ok(peak > .95 && at > WISH.pull);
});

test('the afterglow comes only after the flare, stays in bounds and returns to rest', () => {
  const rest = afterPose(0), end = afterPose(WISH.total);
  for (const a of [rest, end]) assert.ok(a.ringAlpha === 0 && a.columnAlpha === 0);
  let seen = false;
  for (let t = 0; t <= WISH.total; t += .005) {
    const a = afterPose(t);
    assert.ok(a.ring > 0 && a.ring <= 1 && a.column > 0 && a.column <= .6 && a.ringAlpha >= 0 && a.ringAlpha <= .5 && a.columnAlpha >= 0 && a.columnAlpha <= .55, String(t));
    if (a.columnAlpha > 0) { seen = true; assert.ok(t > WISH.pull + .5 + WISH.flare - 1e-9, String(t)); }
  }
  assert.ok(seen);
});

test('the point of light falters while gathering, then steadies before the flare', () => {
  const steady = t => .5 * (t / (WISH.pull + .5)) ** 1;
  let dips = 0, prev = flarePose(.01).alpha;
  for (let t = .02; t < WISH.pull + .5; t += .01) { const a = flarePose(t).alpha; if (a < prev - .002) dips++; prev = a; }
  assert.ok(dips > 3 && steady(1) > 0);
  assert.ok(flarePose(WISH.pull + .5 + WISH.flare / 2).alpha > .95);
});
