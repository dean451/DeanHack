import test from 'node:test';
import assert from 'node:assert/strict';
import {createNurse} from './nurse.js';
import {updateFidget} from './fidget.js';
import * as M from './nurse-tap.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.tapPose(u);
    assert.ok(p.raise >= 0 && p.raise <= 1 + 1e-9 && p.tilt >= 0 && p.tilt <= 1 + 1e-9 && Math.abs(p.flick) <= 1 + 1e-9, `at ${u}`);
  }
  for (const u of [0, 1]) assert.deepEqual(M.tapPose(u), {raise: 0, flick: 0, tilt: 0});
});

test('the head stays tilted after the syringe comes down', () => {
  const p = M.tapPose(.84);
  assert.ok(p.tilt > .99 && p.raise < M.tapPose(.6).raise - .2);
  assert.ok(M.tapPose(.5).tilt > .99);
});

test('a standing nurse taps, stays in bounds and ends exactly at rest', () => {
  const n = createNurse(), arm = n.arms[1];
  const ax = arm.rotation.x, hz = n.head.rotation.z;
  assert.ok(M.taps(n));
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(n, dt, i * dt, false, null);
    if (n.nurseTap?.s != null) seen++;
    assert.ok(arm.rotation.x - ax <= M.FLICK + 1e-9 && ax - arm.rotation.x <= M.RAISE + M.FLICK + 1e-9);
    assert.ok(Math.abs(n.head.rotation.z - hz) <= M.TILT + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(n, dt, i * dt, true, null);
  assert.ok(Math.abs(arm.rotation.x - ax) < 1e-9 && Math.abs(n.head.rotation.z - hz) < 1e-9);
});

test('only nurses do it', () => {
  assert.equal(M.updateNurseTap({quirk: 'priest', head: {}, arms: [{}, {}]}, dt, 0, false), null);
});

test('a stray flick follows the head snapping upright', () => {
  let peak = 0;
  for (let u = .88; u < .92; u += .001) peak = Math.max(peak, Math.abs(M.tapPose(u).flick));
  assert.ok(peak > .15, `stray flick peaks at ${peak}`);
  assert.ok(M.tapPose(.9).tilt < .01 && M.tapPose(.9).raise > .1);
});
