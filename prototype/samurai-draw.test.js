import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamurai} from './samurai.js';
import {updateFidget} from './fidget.js';
import * as M from './samurai-draw.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    for (const [k, v] of Object.entries(M.samuraiDrawPose(u))) assert.ok(v >= -1e-9 && v <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.samuraiDrawPose(u))) assert.equal(v, 0);
});

test('a standing samurai does it, stays in bounds and ends exactly at rest', () => {
  const a = createSamurai();
  const r = {'arms[1].x': a.arms[1].rotation.x, 'head.y': a.head.rotation.y};
  assert.ok(M.draws(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.samuraiDraw?.s != null) seen++;
      assert.ok(Math.abs(a.arms[1].rotation.x - r['arms[1].x']) <= M.RISE + M.SNAP_BACK + 1e-9, 'arms[1].x');
      assert.ok(Math.abs(a.head.rotation.y - r['head.y']) <= M.TURN + 1e-9, 'head.y');
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.arms[1].rotation.x - r['arms[1].x']) < 1e-9);
  assert.ok(Math.abs(a.head.rotation.y - r['head.y']) < 1e-9);
});

test('only samurais do it', () => {
  const o = {kind: 'orc', body: {}, head: {}, arms: [{}, {}]};
  assert.equal(M.draws(o), false);
  assert.equal(M.updateSamuraiDraw(o, dt, 0, false), null);
});
