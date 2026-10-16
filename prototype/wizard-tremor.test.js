import test from 'node:test';
import assert from 'node:assert/strict';
import {createWizard} from './wizard.js';
import {updateFidget} from './fidget.js';
import * as M from './wizard-tremor.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    for (const [k, v] of Object.entries(M.wizardTremorPose(u))) assert.ok(v >= -1 - 1e-9 && v <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.wizardTremorPose(u))) assert.equal(v, 0);
});

test('a standing wizard does it, stays in bounds and ends exactly at rest', () => {
  const a = createWizard();
  const r = {'arms[0].x': a.arms[0].rotation.x, 'arms[0].z': a.arms[0].rotation.z, 'head.z': a.head.rotation.z, 'head.x': a.head.rotation.x};
  assert.ok(M.trembles(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.wizardTremor?.s != null) seen++;
      assert.ok(Math.abs(a.arms[0].rotation.x - r['arms[0].x']) <= M.LIFT + 1e-9, 'arms[0].x');
      assert.ok(Math.abs(a.arms[0].rotation.z - r['arms[0].z']) <= M.SHAKE + 1e-9, 'arms[0].z');
      assert.ok(Math.abs(a.head.rotation.z - r['head.z']) <= M.SQUINT + 1e-9, 'head.z');
      assert.ok(Math.abs(a.head.rotation.x - r['head.x']) <= M.FLINCH + 1e-9, 'head.x');
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.arms[0].rotation.x - r['arms[0].x']) < 1e-9);
  assert.ok(Math.abs(a.arms[0].rotation.z - r['arms[0].z']) < 1e-9);
  assert.ok(Math.abs(a.head.rotation.z - r['head.z']) < 1e-9);
  assert.ok(Math.abs(a.head.rotation.x - r['head.x']) < 1e-9);
});

test('only wizards do it', () => {
  const o = {kind: 'orc', body: {}, head: {}, arms: [{}, {}]};
  assert.equal(M.trembles(o), false);
  assert.equal(M.updateWizardTremor(o, dt, 0, false), null);
});
