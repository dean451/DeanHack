import test from 'node:test';
import assert from 'node:assert/strict';
import {createKnight} from './knight.js';
import {updateFidget} from './fidget.js';
import * as M from './knight-ring.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    for (const [k, v] of Object.entries(M.knightRingPose(u))) assert.ok(v >= -1e-9 && v <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.knightRingPose(u))) assert.equal(v, 0);
});

test('a standing knight does it, stays in bounds and ends exactly at rest', () => {
  const a = createKnight();
  const r = {'arms[0].x': a.arms[0].rotation.x, 'head.z': a.head.rotation.z, 'head.x': a.head.rotation.x};
  assert.ok(M.rings(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.knightRing?.s != null) seen++;
      assert.ok(Math.abs(a.arms[0].rotation.x - r['arms[0].x']) <= M.HEAVE + 1e-9, 'arms[0].x');
      assert.ok(Math.abs(a.head.rotation.z - r['head.z']) <= M.COCK + 1e-9, 'head.z');
      assert.ok(Math.abs(a.head.rotation.x - r['head.x']) <= M.START + 1e-9, 'head.x');
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.arms[0].rotation.x - r['arms[0].x']) < 1e-9);
  assert.ok(Math.abs(a.head.rotation.z - r['head.z']) < 1e-9);
  assert.ok(Math.abs(a.head.rotation.x - r['head.x']) < 1e-9);
});

test('only knights do it', () => {
  const o = {kind: 'orc', body: {}, head: {}, arms: [{}, {}]};
  assert.equal(M.rings(o), false);
  assert.equal(M.updateKnightRing(o, dt, 0, false), null);
});
