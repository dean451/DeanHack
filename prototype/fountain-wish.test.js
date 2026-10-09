import test from 'node:test';
import assert from 'node:assert/strict';
import {motePose, flarePose, afterPose, formPose, isWishMessage, createFountainWish, WISH} from './fountain-wish.js';

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

test('the wished-for shard forms after the flare begins, stays in bounds and returns to rest', () => {
  for (const t of [0, WISH.total]) assert.equal(formPose(t).alpha, 0);
  let seen = false;
  for (let t = 0; t <= WISH.total; t += .005) {
    const f = formPose(t);
    assert.ok(f.alpha >= 0 && f.alpha <= .95 + 1e-9 && f.size > 0 && f.size <= .1 + 1e-9 && f.y > .2 && f.y <= .6 && Math.abs(f.tilt) < 1, String(t));
    if (f.alpha > 0) { seen = true; assert.ok(t > WISH.pull + .5, String(t)); }
  }
  assert.ok(seen);
});

test('a wish by any means plays once, not twice, when both lines arrive', () => {
  assert.ok(isWishMessage('For what do you wish?'));
  assert.ok(!isWishMessage('For what do you pray?'));
  let made = 0;
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: () => { made++; }, y: 0}; this.rotation = {set() {}}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createFountainWish(THREE, {add() {}, remove() {}});
  fx.message('Grateful for his release, he grants you a wish!', 1, 1);
  fx.message('For what do you wish?', 1, 1);
  assert.equal(fx.active, 1);
  fx.update(WISH.total + .1); fx.message('For what do you wish?', 1, 1);
  assert.equal(fx.active, 1);
});

test('the last mote lands after all the others', () => {
  const landed = i => { let t = 0; while (t < WISH.total && motePose(i, t + .005).r > 0) t += .005; return t; };
  const last = landed(WISH.motes - 1);
  for (let i = 0; i < WISH.motes - 1; i++) assert.ok(landed(i) < last - .2, String(i));
});

test('the point of light gutters once before the flare, then still flares and rests', () => {
  const a = t => flarePose(t).alpha, before = WISH.pull + .3;
  assert.ok(a(before + .075) < a(before - .02) * .6, 'it dips');
  assert.ok(a(WISH.pull + .5 + WISH.flare / 2) > .9);
  assert.equal(a(WISH.total), 0);
});

test('the afterglow column stutters once while it stands', () => {
  const t0 = WISH.pull + .5 + WISH.flare, at = u => afterPose(t0 + u * WISH.settle).columnAlpha;
  assert.ok(at(.35) < at(.25) * .6 && at(.35) < at(.45) * .6);
});

test('motes gutter like embers on the way in, never leaving bounds, and still vanish into the point', () => {
  for (let i = 0; i < WISH.motes; i++) {
    const a = Array.from({length: 200}, (_, k) => motePose(i, k * .012).alpha);
    assert.ok(a.every(x => x >= 0 && x <= .9 + 1e-9), String(i));
    assert.ok(a.some((x, k) => k && x > a[k - 1] && a[k - 1] > .1 && x < .9), `catches ${i}`);
  }
  assert.equal(motePose(0, WISH.pull + .5).alpha, 0);
});
