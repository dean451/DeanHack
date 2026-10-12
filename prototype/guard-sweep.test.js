import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './guard-sweep.js';

const dt = 1 / 60;
const guard = name => createCreature({name, symbol: '@'.charCodeAt(0), color: 1});

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.sweepPose(u);
    assert.ok(Math.abs(p.scan) <= 1 + 1e-9, `scan at ${u}`);
    assert.ok(p.hitch >= 0 && p.hitch <= 1 + 1e-9, `hitch at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.sweepPose(u))) assert.equal(v, 0);
});

test('the head looks both ways', () => {
  let lo = 0, hi = 0;
  for (let u = 0; u <= 1; u += .002) { const s = M.sweepPose(u).scan; lo = Math.min(lo, s); hi = Math.max(hi, s); }
  assert.ok(lo < -.99 && hi > .99);
});

for (const name of ['soldier', 'watchman']) test(`a standing ${name} sweeps, stays in bounds and ends exactly at rest`, () => {
  const a = guard(name), y = a.head.rotation.y, z = a.arms[1].rotation.x;
  assert.ok(M.sweeps(a));
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.guardSweep?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.y - y) <= M.SCAN + 1e-9 && Math.abs(a.arms[1].rotation.x - z) <= M.HITCH + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.y - y) < 1e-9 && Math.abs(a.arms[1].rotation.x - z) < 1e-9);
});

test('only guards do it', () => {
  const newt = guard('newt');
  assert.equal(M.updateGuardSweep(newt, dt, 0, false), null);
  assert.equal(M.sweeps(newt), false);
});
