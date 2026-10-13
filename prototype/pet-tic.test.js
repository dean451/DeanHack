import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './pet-tic.js';

const dt = 1 / 60;
const pet = () => { const a = createCreature({name: 'little dog', symbol: 'd'.charCodeAt(0), color: 1, kind: 'pet'}); a.species = 'little dog'; return a; };

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.ticPose(u);
    for (const k of Object.keys(p)) assert.ok(Math.abs(p[k]) <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.ticPose(u))) assert.equal(v, 0);
});

test('a standing pet dog does it, stays in bounds and ends exactly at rest', () => {
  const a = pet(), y = a.head.rotation.y, z = a.head.rotation.z, tz = a.tail?.rotation.z ?? 0;
  assert.ok(M.tics(a), 'dog quirk');
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.petTic?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.y - y) <= M.COCK + 1e-9 && Math.abs(a.head.rotation.z - z) <= M.TILT + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.y - y) < 1e-9 && Math.abs(a.head.rotation.z - z) < 1e-9);
  if (a.tail) assert.ok(Math.abs(a.tail.rotation.z - tz) < 1e-9);
});

test('only pet dogs do it', () => {
  const j = createCreature({name: 'jackal', symbol: 'd'.charCodeAt(0), color: 1});
  assert.equal(M.updatePetTic(j, dt, 0, false), null);
  assert.equal(M.tics(j), false);
});

test('after straightening the head shakes twice and settles', () => {
  const at = u => M.ticPose(u).cock;
  assert.equal(at(.9) !== 0 || at(.92) !== 0 || at(.94) !== 0, true);
  let flips = 0, prev = 0;
  for (let u = .88; u < 1; u += .001) { const c = at(u); if (prev && c && Math.sign(c) !== Math.sign(prev)) flips++; if (c) prev = c; }
  assert.ok(flips >= 3 && flips <= 5, `flips ${flips}`);
  assert.equal(at(1), 0);
});
