import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaveman} from './caveman.js';
import {updateFidget} from './fidget.js';
import * as M from './caveman-thump.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    for (const [k, v] of Object.entries(M.thumpPose(u))) assert.ok(v >= 0 && v <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.thumpPose(u))) assert.equal(v, 0);
});

test('three slaps, the third late, then the head jerks up', () => {
  assert.ok(M.thumpPose(.3).slap > .95 && M.thumpPose(.42).slap > .95);
  assert.ok(M.thumpPose(.36).slap < .1, 'the club lifts between slaps');
  assert.ok(M.thumpPose(.62).slap > .95, 'the third lands late');
  assert.ok(M.thumpPose(.5).watch > .95 && M.thumpPose(.75).start > .95);
});

test('standing cavemen and neanderthals do it, stay in bounds and end exactly at rest', () => {
  for (const name of ['caveman', 'neanderthal']) {
    const a = createCaveman(name), parts = [a.head, ...a.arms];
    const r = parts.map(p => p.rotation.x);
    assert.ok(M.thumps(a), name);
    let seen = 0;
    for (let i = 0; i < 60 * 60; i++) {
      updateFidget(a, dt, i * dt, false, null);
      if (a.cavemanThump?.s != null) seen++;
      assert.ok(Math.abs(a.head.rotation.x - r[0]) <= M.WATCH + M.START + 1e-9);
      assert.ok(Math.abs(a.arms[0].rotation.x - r[1]) <= M.MEET + 1e-9);
      assert.ok(Math.abs(a.arms[1].rotation.x - r[2]) <= M.HEFT + 1e-9);
    }
    assert.ok(seen > 60, `${name} moved`);
    for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
    parts.forEach((p, i) => assert.ok(Math.abs(p.rotation.x - r[i]) < 1e-9, name));
  }
});

test('only cavemen do it', () => {
  const o = {kind: 'wizard', body: {}, head: {}, arms: [{}, {}]};
  assert.equal(M.thumps(o), false);
  assert.equal(M.updateCavemanThump(o, dt, 0, false), null);
});
