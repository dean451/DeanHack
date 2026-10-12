import test from 'node:test';
import assert from 'node:assert/strict';
import {createShopkeeper} from './shopkeeper.js';
import {updateFidget} from './fidget.js';
import * as M from './shopkeeper-tally.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    for (const [k, v] of Object.entries(M.tallyPose(u))) assert.ok(v >= 0 && v <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.tallyPose(u))) assert.equal(v, 0);
});

test('three jabs, the last one hardest, then the stare to the door', () => {
  assert.ok(M.tallyPose(.22).jab > .55 && M.tallyPose(.42).jab > .95);
  assert.ok(M.tallyPose(.27).jab < .2, 'the jabs are separate');
  assert.ok(M.tallyPose(.4).stare === 0 && M.tallyPose(.8).stare > .99);
});

test('a standing shopkeeper tallies, stays in bounds and ends exactly at rest', () => {
  const a = createShopkeeper();
  const r = [a.head.rotation.x, a.head.rotation.y, a.arms[0].rotation.x, a.arms[1].rotation.x];
  assert.ok(M.tallies(a));
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.shopTally?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.x - r[0]) <= M.BOW + 1e-9 && Math.abs(a.head.rotation.y - r[1]) <= M.STARE + 1e-9);
    assert.ok(Math.abs(a.arms[0].rotation.x - r[2]) <= M.LIFT + 1e-9 && Math.abs(a.arms[1].rotation.x - r[3]) <= M.SAG + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.x - r[0]) < 1e-9 && Math.abs(a.head.rotation.y - r[1]) < 1e-9);
  assert.ok(Math.abs(a.arms[0].rotation.x - r[2]) < 1e-9 && Math.abs(a.arms[1].rotation.x - r[3]) < 1e-9);
});

test('only shopkeepers do it', () => {
  assert.equal(M.updateShopkeeperTally({quirk: 'guard', head: {}, arms: [{}, {}], body: {}}, dt, 0, false), null);
});
