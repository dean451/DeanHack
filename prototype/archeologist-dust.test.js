import test from 'node:test';
import assert from 'node:assert/strict';
import {createArcheologist} from './archeologist.js';
import {updateFidget} from './fidget.js';
import * as M from './archeologist-dust.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    const p = M.dustPose(u);
    for (const [k, v] of Object.entries(p)) assert.ok(v >= -1 - 1e-9 && v <= 1 + 1e-9, `${k} at ${u}`);
    for (const k of ['lift', 'blow', 'cough']) assert.ok(p[k] >= 0, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.dustPose(u))) assert.equal(v, 0);
});

test('two brush strokes, a blow, then two coughs', () => {
  assert.ok(M.dustPose(.3).lift > .95);
  assert.ok(Math.abs(M.dustPose(.17).brush) > .5 || Math.abs(M.dustPose(.25).brush) > .5);
  assert.ok(M.dustPose(.56).blow > .95 && M.dustPose(.56).cough < .01);
  assert.ok(M.dustPose(.7).cough > .95 && M.dustPose(.78).cough > .95);
  assert.ok(M.dustPose(.74).cough < .1, 'the head comes forward between coughs');
});

test('a standing archeologist does it, stays in bounds and ends exactly at rest', () => {
  const a = createArcheologist(), parts = [a.head, ...a.arms];
  const r = parts.map(p => [p.rotation.x, p.rotation.z]);
  assert.ok(M.dusts(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.archeologistDust?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.x - r[0][0]) <= M.COUGH + M.BLOW + 1e-9);
    assert.ok(Math.abs(a.arms[0].rotation.x - r[1][0]) <= M.LIFT + .5 + 1e-9);
    assert.ok(Math.abs(a.arms[0].rotation.z - r[1][1]) <= M.BRUSH + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  parts.forEach((p, i) => assert.ok(Math.abs(p.rotation.x - r[i][0]) < 1e-9 && Math.abs(p.rotation.z - r[i][1]) < 1e-9));
});

test('only archeologists do it', () => {
  const o = {kind: 'wizard', body: {}, head: {}, arms: [{}, {}]};
  assert.equal(M.dusts(o), false);
  assert.equal(M.updateArcheologistDust(o, dt, 0, false), null);
});
