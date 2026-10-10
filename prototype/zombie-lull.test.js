import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as Z from './zombie-lull.js';

const dt = 1 / 60;
const mon = name => { const a = createCreature({name, symbol: 'Z'.charCodeAt(0), color: 1}); a.species = name; return a; };

test('lull poses stay in bounds, end at zero and the head snaps up in two stages', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = Z.lullPose(u);
    assert.ok(p.sag >= -1e-9 && p.sag <= 1 && p.spasm >= 0 && p.spasm <= 1, `${u}`);
  }
  assert.deepEqual(Z.lullPose(0), {sag: 0, spasm: 0});
  assert.deepEqual(Z.lullPose(1), {sag: 0, spasm: 0});
  assert.ok(Z.lullPose(.55).sag > .9, 'held low');
  assert.ok(Z.lullPose(.67).sag < Z.lullPose(.55).sag && Z.lullPose(.67).sag > Z.lullPose(.78).sag, 'two stages up');
});

test('a standing zombie lulls now and then, stays in bounds and ends exactly at rest', () => {
  const a = mon('human zombie'), z = a.head.rotation.z, x = a.head.rotation.x, ax = a.arms[1].rotation.x;
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.zombieLull?.s != null) seen++;
    assert.ok(a.head.rotation.z - z <= Z.SAG + 1e-9 && a.head.rotation.z - z >= -1e-9);
    assert.ok(a.head.rotation.x - x <= Z.NOD + 1e-9 && Math.abs(a.arms[1].rotation.x - ax) <= Z.SPASM + 1e-9);
  }
  assert.ok(seen > 60, 'it lulled');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.z - z) < 1e-9 && Math.abs(a.head.rotation.x - x) < 1e-9 && Math.abs(a.arms[1].rotation.x - ax) < 1e-9);
});

test('only zombies lull', () => {
  assert.equal(Z.updateZombieLull(mon('jackal'), dt, 0, false), null);
  assert.ok(Z.lulls(mon('ettin zombie')));
});
