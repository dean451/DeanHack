import test from 'node:test';
import assert from 'node:assert/strict';
import {createPiercer} from './piercer.js';
import {updateFidget} from './fidget.js';
import * as M from './piercer-lurch.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    const p = M.lurchPose(u);
    for (const k of ['rear', 'shake', 'drop']) assert.ok(p[k] >= 0 && p[k] <= 1 + 1e-9, `${k} at ${u}`);
    assert.ok(Math.abs(p.rock) <= 1 + 1e-9, `rock at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.lurchPose(u))) assert.equal(v, 0);
});

test('it rears, trembles, then drops hard and rocks', () => {
  assert.ok(M.lurchPose(.5).rear > .9 && M.lurchPose(.5).shake > .9);
  assert.ok(M.lurchPose(.64).drop > .99 && M.lurchPose(.64).rear < .1, 'the drop lets go of the rear');
  let rock = 0;
  for (let u = .62; u < .9; u += .002) rock = Math.max(rock, Math.abs(M.lurchPose(u).rock));
  assert.ok(rock > .3);
});

for (const kind of ['piercer', 'iron piercer', 'glass piercer']) test(`a standing ${kind} lurches, stays in bounds and ends exactly at rest`, () => {
  const a = createPiercer(kind), b = a.body;
  const r = [b.rotation.x, b.rotation.z, b.position.y];
  assert.ok(M.lurches(a));
  let seen = 0;
  for (let i = 0; i < 60 * 50; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.piercerLurch?.s != null) seen++;
    assert.ok(Math.abs(b.rotation.x - r[0]) <= M.REAR + 1e-9);
    assert.ok(Math.abs(b.rotation.z - r[1]) <= M.ROCK + M.SHAKE + 1e-9);
    assert.ok(Math.abs(b.position.y - r[2]) <= M.DROP + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(b.rotation.x - r[0]) < 1e-9 && Math.abs(b.rotation.z - r[1]) < 1e-9 && Math.abs(b.position.y - r[2]) < 1e-9);
});

test('only piercers do it', () => {
  assert.equal(M.updatePiercerLurch({quirk: 'idle', kind: 'newt', body: {}, legs: []}, dt, 0, false), null);
  assert.equal(M.lurches({kind: 'newt', body: {}, legs: []}), false);
});
