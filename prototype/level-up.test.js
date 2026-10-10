import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FLICKER_AT, FLICKER_LEN, FLICKER_ALPHA, isLevelUp, ringPose, moteFlight, createLevelUp, LEVEL} from './level-up.js';

test('only the level message counts', () => {
  assert.ok(isLevelUp('Welcome to experience level 5.'));
  for (const t of ['Welcome to level 5.', 'You feel more experienced.', null]) assert.ok(!isLevelUp(t), String(t));
});

test('the ring draws tight, motes stay above the floor and in reach, all end at nothing', () => {
  assert.ok(ringPose(0).radius > ringPose(LEVEL.ring).radius);
  assert.equal(ringPose(-1).alpha, 0);
  assert.equal(ringPose(LEVEL.total).alpha, 0);
  for (let i = 0; i < LEVEL.motes; i++) {
    assert.equal(moteFlight(i, 0).alpha, 0);
    assert.equal(moteFlight(i, LEVEL.total).alpha, 0);
    for (let t = 0; t < LEVEL.total; t += .03) {
      const f = moteFlight(i, t);
      assert.ok(f.alpha >= 0 && f.alpha <= 1.001, `alpha ${f.alpha}`);
      assert.ok(f.y >= 0 && f.y <= 2, `y ${f.y}`);
      assert.ok(Math.hypot(f.x, f.z) <= .23);
    }
  }
});

test('a flourish plays, expires and leaves nothing in the scene', () => {
  const parent = new THREE.Group(), fx = createLevelUp(THREE, parent);
  assert.equal(fx.message('You hit the newt.', 1, 1), null);
  assert.equal(fx.message('Welcome to experience level 2.', Number.NaN, 0), null);
  assert.ok(fx.message('Welcome to experience level 2.', 3, 4));
  fx.update(.5);
  assert.equal(fx.active, 1);
  for (let i = 0; i < 30; i++) fx.update(.1);
  assert.equal(fx.active, 0);
  assert.equal(parent.children.length, 0);
  fx.message('Welcome to experience level 3.', 0, 0); fx.clear();
  assert.equal(parent.children.length, 0);
  fx.dispose();
});

test('the last mote is tugged back down mid-flight, then climbs on', () => {
  const last = LEVEL.motes - 1, start = LEVEL.ring * .7 + (last / LEVEL.motes) * .5, life = LEVEL.total - start - .1;
  const y = u => moteFlight(last, start + u * life).y;
  assert.ok(y(.5) < y(.35), 'it sinks back');
  assert.ok(y(.8) > y(.35), 'then lets go');
  const other = moteFlight(0, LEVEL.ring * .7 + .5 * .45).y;
  assert.ok(other > 0);
});

test('the ring catches on its way in but never opens back out', () => {
  let last = Infinity, slowed;
  for (let t = 0; t <= LEVEL.ring + 1e-9; t += .002) {
    const r = ringPose(t).radius;
    assert.ok(r <= last + 1e-9 && r >= .15 - 1e-9 && r <= .9 + 1e-9, String(t)); last = r;
  }
  const slope = t => ringPose(t - .005).radius - ringPose(t + .005).radius;
  let fast = 0; slowed = Infinity;
  for (let t = .03; t < LEVEL.ring - .03; t += .01) { const v = slope(t); slowed = Math.min(slowed, v); fast = Math.max(fast, v); }
  assert.ok(slowed < fast * .5, `catches: ${slowed} vs ${fast}`);
  assert.ok(Math.abs(ringPose(0).radius - .9) < 1e-9 && Math.abs(ringPose(LEVEL.ring).radius - .15) < 1e-9);
});

test('a last cold flicker of the tight ring blinks after it has gone out, then nothing', () => {
  assert.equal(ringPose(FLICKER_AT - .02).alpha, 0);
  const mid = ringPose(FLICKER_AT + FLICKER_LEN / 2);
  assert.ok(mid.alpha > .1 && mid.alpha <= FLICKER_ALPHA + 1e-9 && Math.abs(mid.radius - .15) < 1e-9, JSON.stringify(mid));
  assert.equal(ringPose(FLICKER_AT + FLICKER_LEN + .02).alpha, 0);
  assert.ok(FLICKER_AT + FLICKER_LEN < LEVEL.total);
});
