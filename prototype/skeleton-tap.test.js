import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkeleton} from './skeleton.js';
import {updateFidget} from './fidget.js';
import * as M from './skeleton-tap.js';
import * as Z from './zombie-lull.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    for (const [k, v] of Object.entries(M.tapPose(u))) assert.ok(v >= 0 && v <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.tapPose(u))) assert.equal(v, 0);
});

test('three raps, the last hardest, then the head cocks to listen', () => {
  assert.ok(M.tapPose(.3).knock > .55 && M.tapPose(.5).knock > .95);
  assert.ok(M.tapPose(.35).knock < .1, 'the hand lifts between raps');
  assert.ok(M.tapPose(.7).listen > .95 && M.tapPose(.7).lift > .5);
});

test('a standing skeleton does it, stays in bounds and ends exactly at rest', () => {
  const a = createSkeleton(), parts = [a.head, ...a.arms];
  const r = parts.map(p => [p.rotation.x, p.rotation.z]);
  assert.ok(M.taps(a));
  let seen = 0;
  for (let i = 0; i < 60 * 50; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.skeletonTap?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.z - r[0][1]) <= M.LISTEN + Z.SAG + 1e-9);
    assert.ok(Math.abs(a.head.rotation.x - r[0][0]) <= M.NOD + Z.NOD + 1e-9);
    assert.ok(Math.abs(a.arms[0].rotation.x - r[1][0]) <= M.LIFT + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  parts.forEach((p, i) => assert.ok(Math.abs(p.rotation.x - r[i][0]) < 1e-9 && Math.abs(p.rotation.z - r[i][1]) < 1e-9));
});

test('only skeletons do it', () => {
  const o = {quirk: 'zombie', kind: 'zombie', body: {}, head: {}, arms: [{}, {}]};
  assert.equal(M.taps(o), false);
  assert.equal(M.updateSkeletonTap(o, dt, 0, false), null);
});
