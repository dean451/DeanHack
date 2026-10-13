import test from 'node:test';
import assert from 'node:assert/strict';
import {fleckPose, ringPose, stepDirection, createStairStep, STEP} from './stair-step.js';

test('only a one-level move on the same branch is a stair step', () => {
  assert.equal(stepDirection('Dungeons', 1, 'Dungeons', 2), 1);
  assert.equal(stepDirection('Dungeons', 3, 'Dungeons', 2), -1);
  for (const a of [['Dungeons', 1, 'Dungeons', 4], ['Dungeons', 2, 'Mines', 3], [null, 0, 'Dungeons', 1], ['Dungeons', 2, 'Dungeons', 2], ['Dungeons', NaN, 'Dungeons', 1]]) assert.equal(stepDirection(...a), 0, String(a));
});

test('every part starts and ends invisible, in both directions', () => {
  for (const dir of [1, -1]) for (const t of [0, STEP.total]) {
    assert.equal(ringPose(t, dir).alpha, 0);
    for (let i = 0; i < STEP.flecks; i++) assert.equal(fleckPose(i, t, dir).alpha, 0);
  }
});

test('poses stay in bounds; flecks rise going down and fall going up; one hangs late', () => {
  const first = [Infinity, Infinity];
  for (const [k, dir] of [[0, 1], [1, -1]]) {
    for (let t = 0; t <= STEP.total; t += .005) {
      for (let i = 0; i < STEP.flecks; i++) {
        const p = fleckPose(i, t, dir);
        assert.ok(p.y >= 0 && p.y <= .6 && Math.hypot(p.x, p.z) <= .16 && p.alpha >= 0 && p.alpha <= 1, `${i} ${t}`);
        if (p.alpha > 0 && i === 1) first[k] = Math.min(first[k], t);
      }
      const r = ringPose(t, dir); assert.ok(r.scale > 0 && r.scale <= .6 && r.alpha >= 0 && r.alpha <= .5);
    }
  }
  const dy = dir => fleckPose(1, .3, dir).y - fleckPose(1, .12, dir).y;
  assert.ok(dy(1) > 0 && dy(-1) < 0);
  assert.ok(fleckPose(0, .1, 1).alpha === 0 && fleckPose(1, .1, 1).alpha > 0);
});

test('the ring closes in going down and spreads going up', () => {
  assert.ok(ringPose(.5, 1).scale < ringPose(.1, 1).scale);
  assert.ok(ringPose(.5, -1).scale > ringPose(.1, -1).scale);
});

test('it ends, cleans up, and ignores a bad direction', () => {
  const removed = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}}; this.rotation = {}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createStairStep(THREE, {add() {}, remove: g => removed.push(g)});
  fx.arrive(0); assert.equal(fx.active, 0);
  fx.arrive(1, 0, 0); assert.equal(fx.active, 1);
  for (let i = 0; i < 100; i++) fx.update(.02);
  assert.equal(fx.active, 0); assert.equal(removed.length, 1);
  fx.arrive(-1); fx.clear(); assert.equal(fx.active, 0);
});

test('the ring catches once mid-close, never reversing past its start, and ends at rest', () => {
  let slow = Infinity, max = 0;
  for (let t = .05; t < .55; t += .01) { const d = ringPose(t, 1).scale - ringPose(t + .01, 1).scale; slow = Math.min(slow, d); max = Math.max(max, d); }
  assert.ok(slow < max / 2, 'a hitch in the close');
  for (const dir of [1, -1]) { const s = ringPose(0, dir).scale, e = ringPose(STEP.total, dir).scale; assert.ok(s <= .6 && e <= .6 && ringPose(STEP.total, dir).alpha === 0); }
});

test('the late fleck drifts sideways against the rest and stays in bounds', () => {
  // Fleck 0 sways off its radial line; compare against the same pose without the sway (fleck angle is fixed).
  const off = (i, t) => { const p = fleckPose(i, t, 1), a = i * 2.4 + .7; return Math.abs(-Math.sin(a) * p.x + Math.cos(a) * p.z); };
  let sway0 = 0, sway1 = 0;
  for (let t = 0; t <= STEP.total; t += .01) { sway0 = Math.max(sway0, off(0, t)); sway1 = Math.max(sway1, off(1, t)); }
  assert.ok(sway0 > .015 && sway1 < 1e-9);
});
