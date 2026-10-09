import test from 'node:test';
import assert from 'node:assert/strict';
import {flashPose, ringPose, echoPose, spikePose, isWandWish, createWandWishFlare, FLARE} from './wand-wish-flare.js';

test('only a wand wish triggers it', () => {
  assert.ok(isWandWish({type: 'wish', source: 'wand'}));
  for (const v of [{type: 'wish', source: 'bottle'}, {type: 'wish', source: 'demon'}, {type: 'pickup', source: 'wand'}, null]) assert.ok(!isWandWish(v), JSON.stringify(v));
});

test('every part starts and ends invisible', () => {
  for (const t of [0, FLARE.total, FLARE.total + 1]) for (const p of [flashPose(t), ringPose(t), echoPose(t), spikePose(t)]) assert.equal(p.alpha, 0, String(t));
});

test('the flash hits hard and early, and everything stays in bounds', () => {
  let peak = 0, at = 0;
  for (let t = 0; t <= FLARE.total; t += .005) {
    const f = flashPose(t), r = ringPose(t), s = spikePose(t);
    for (const a of [f.alpha, r.alpha, s.alpha]) assert.ok(a >= 0 && a <= 1, String(t));
    assert.ok(f.size <= .7 + 1e-9 && r.radius <= 1.75 + 1e-9 && s.height <= 1.61 && s.y >= 0, String(t));
    if (f.alpha > peak) { peak = f.alpha; at = t; }
  }
  assert.ok(peak > .8 && at < .1);
});

test('the ring only spreads outward', () => {
  let prev = 0;
  for (let t = .001; t < FLARE.total; t += .01) { const r = ringPose(t).radius; assert.ok(r >= prev, String(t)); prev = r; }
});

test('the effect plays once per wand wish and cleans up', () => {
  const made = [], THREE = new Proxy({}, {get: (_, k) => k === 'AdditiveBlending' ? 2 : class { constructor() { this.position = {set() {}, y: 0}; this.scale = {set() {}, setScalar() {}}; this.rotation = {}; this.material = {}; made.push(this); } add() {} dispose() {} }});
  const parent = {add() {}, remove() {}}, fx = createWandWishFlare(THREE, parent);
  fx.wish({type: 'wish', source: 'bottle'}, 1, 1); assert.equal(fx.active, 0);
  fx.wish({type: 'wish', source: 'wand'}, 1, 1); assert.equal(fx.active, 1);
  fx.update(.5); assert.equal(fx.active, 1);
  fx.update(.5); assert.equal(fx.active, 0);
  fx.wish({type: 'wish', source: 'wand'}, 1, 1); fx.clear(); assert.equal(fx.active, 0);
});

test('the echo ring comes late, stays faint and stalls short of the main ring', () => {
  assert.equal(echoPose(.2).alpha, 0);
  let peak = 0, rmax = 0;
  for (let t = 0; t <= FLARE.total; t += .005) { const e = echoPose(t); assert.ok(e.alpha >= 0 && e.alpha <= .35 + 1e-9, String(t)); peak = Math.max(peak, e.alpha); rmax = Math.max(rmax, e.radius); }
  assert.ok(peak > .1 && rmax <= 1.0 + 1e-9 && rmax < 1.75);
});

test('the spike stutters dark once as it snaps off, then returns to rest', () => {
  const a = u => spikePose(u * FLARE.total).alpha;
  assert.ok(a(.37) < a(.3) * .5, 'blinks dark');
  assert.ok(a(.5) > a(.37), 'strikes again');
  for (let u = 0; u <= 1; u += .005) assert.ok(a(u) >= 0 && a(u) <= .9 + 1e-9);
  assert.equal(spikePose(FLARE.total).alpha, 0);
});

test('the flash flickers back once as it dies', () => {
  const a = u => flashPose(u * FLARE.total).alpha;
  assert.ok(a(.46) > a(.4), 'jerks back in');
  for (let t = 0; t <= FLARE.total; t += .005) assert.ok(flashPose(t).alpha >= 0 && flashPose(t).alpha <= 1);
  assert.equal(flashPose(FLARE.total).alpha, 0);
});
