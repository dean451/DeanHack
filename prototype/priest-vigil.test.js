import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './priest-vigil.js';

const dt = 1 / 60;
const priest = () => createCreature({name: 'aligned priest', symbol: '@'.charCodeAt(0), color: 1});

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.vigilPose(u);
    assert.ok(p.bow >= 0 && p.bow <= 1 + 1e-9, `bow at ${u}`);
    assert.ok(Math.abs(p.refuse) <= 1 + 1e-9, `refuse at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.vigilPose(u))) assert.equal(v, 0);
});

test('the head shakes only while it is bowed', () => {
  for (let u = 0; u <= 1; u += .005) { const p = M.vigilPose(u); if (p.bow < .5) assert.ok(Math.abs(p.refuse) < 1e-6, `at ${u}`); }
});

test('a standing priest keeps vigil, stays in bounds and ends exactly at rest', () => {
  const a = priest(), x = a.head.rotation.x, y = a.head.rotation.y, z = a.arms[0].rotation.x;
  assert.ok(M.keepsVigil(a));
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.priestVigil?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.x - x) <= M.BOW + 1e-9 && Math.abs(a.head.rotation.y - y) <= M.REFUSE + 1e-9);
    assert.ok(Math.abs(a.arms[0].rotation.x - z) <= M.WARD + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.x - x) < 1e-9 && Math.abs(a.head.rotation.y - y) < 1e-9 && Math.abs(a.arms[0].rotation.x - z) < 1e-9);
});

test('only priests do it', () => {
  const rat = createCreature({name: 'newt', symbol: ':'.charCodeAt(0), color: 1});
  assert.equal(M.updatePriestVigil(rat, dt, 0, false), null);
  assert.equal(M.keepsVigil(rat), false);
});
