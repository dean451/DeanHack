import test from 'node:test';
import assert from 'node:assert/strict';
import {createValkyrie} from './valkyrie.js';
import {updateFidget} from './fidget.js';
import * as M from './valkyrie-whet.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    for (const [k, v] of Object.entries(M.valkyrieWhetPose(u))) assert.ok(v >= -1e-9 && v <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.valkyrieWhetPose(u))) assert.equal(v, 0);
});

test('the edge is tested twice, then the head snaps round', () => {
  const peaks = [];
  let prev = 0, rising = false;
  for (let u = 0; u <= 1; u += .001) {
    const j = M.valkyrieWhetPose(u).jerk;
    if (j > prev) rising = true; else if (rising && j < prev && prev > .9) { peaks.push(u); rising = false; }
    prev = j;
  }
  assert.equal(peaks.length, 2);
  assert.ok(M.valkyrieWhetPose(.75).turn > .9, 'head turned after the second jerk');
  assert.ok(M.valkyrieWhetPose(.3).turn < .01, 'not before');
});

test('a standing valkyrie does it, stays in bounds and ends exactly at rest', () => {
  const a = createValkyrie();
  const r = {arm: a.arms[1].rotation.x, hx: a.head.rotation.x, hy: a.head.rotation.y};
  assert.ok(M.whets(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.valkyrieWhet?.s != null) seen++;
    assert.ok(Math.abs(a.arms[1].rotation.x - r.arm) <= M.LIFT + 1e-9, 'arm');
    assert.ok(Math.abs(a.head.rotation.x - r.hx) <= M.DIP + 1e-9, 'head.x');
    assert.ok(Math.abs(a.head.rotation.y - r.hy) <= M.TURN + 1e-9, 'head.y');
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.arms[1].rotation.x - r.arm) < 1e-9);
  assert.ok(Math.abs(a.head.rotation.x - r.hx) < 1e-9);
  assert.ok(Math.abs(a.head.rotation.y - r.hy) < 1e-9);
});

test('only valkyries do it', () => {
  const o = {kind: 'orc', body: {}, head: {}, arms: [{}, {}]};
  assert.equal(M.whets(o), false);
  assert.equal(M.updateValkyrieWhet(o, dt, 0, false), null);
});
