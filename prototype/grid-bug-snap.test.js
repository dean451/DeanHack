import test from 'node:test';
import assert from 'node:assert/strict';
import {createGridBug} from './grid-bug.js';
import {updateFidget} from './fidget.js';
import * as M from './grid-bug-snap.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    const p = M.snapPose(u);
    assert.ok(p.yaw >= -1 - 1e-9 && p.yaw <= 1 + 1e-9 && p.buzz >= 0 && p.buzz <= 1 + 1e-9, `at ${u}`);
  }
  for (const u of [0, 1]) assert.deepEqual(M.snapPose(u), {yaw: 0, buzz: 0});
  assert.ok(Math.abs(M.snapPose(.999).yaw) < 1e-9, 'settles before the end');
});

test('the turn is stepped: it jumps in hard snaps and swings past the start', () => {
  assert.equal(M.snapPose(.2).yaw, 1);
  assert.equal(M.snapPose(.5).yaw, -1);
  assert.ok(M.snapPose(.095).yaw === 0 && M.snapPose(.13).yaw === 1, 'no easing before a snap');
});

test('a standing grid bug snaps, stays in bounds and ends exactly at rest', () => {
  const bug = createGridBug(), a = bug;
  const y = a.body.rotation.y, py = a.body.position.y, lx = a.legs.map(l => l.rotation.x);
  assert.ok(M.snaps(a));
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.gridBugSnap?.s != null) seen++;
    assert.ok(Math.abs(a.body.rotation.y - y) <= M.SNAP_YAW + 1e-9);
    assert.ok(a.body.position.y - py >= -1e-9 && a.body.position.y - py <= M.JOLT + 1e-9);
    a.legs.forEach((l, k) => assert.ok(Math.abs(l.rotation.x - lx[k]) <= M.BUZZ + 1e-9));
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.body.rotation.y - y) < 1e-9 && Math.abs(a.body.position.y - py) < 1e-9);
  a.legs.forEach((l, k) => assert.ok(Math.abs(l.rotation.x - lx[k]) < 1e-9));
  a.g.userData.dispose();
});

test('only grid bugs do it', () => {
  assert.equal(M.updateGridBugSnap({quirk: 'rat', body: {}, legs: []}, dt, 0, false), null);
});
