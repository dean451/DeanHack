import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './pet-cat-tic.js';

const dt = 1 / 60;
const cat = (pet = true) => { const a = createCreature({name: 'kitten', symbol: 'f'.charCodeAt(0), color: 1, kind: pet ? 'pet' : 'monster'}); a.petCat = pet; return a; };

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) for (const v of Object.values(M.kneadPose(u))) assert.ok(v >= 0 - 1e-9 && v <= 1 + 1e-9, `at ${u}`);
  for (const u of [0, 1]) for (const v of Object.values(M.kneadPose(u))) assert.equal(v, 0);
});

test('the last paw is held up past the treads', () => {
  const p = M.kneadPose(.78);
  assert.ok(p.r > .99 && p.l === 0 && p.stiff > .99);
});

test('a standing pet cat kneads, stays in bounds and ends exactly at rest', () => {
  const a = cat(), x = a.head.rotation.x, tz = a.tail.rotation.z, lx = a.legs.map(l => l.rotation.x);
  assert.ok(M.kneads(a));
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.petCatTic?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.x - x) <= M.SINK + 1e-9);
    assert.ok(Math.abs(a.legs[1].rotation.x - lx[1]) <= M.TREAD + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.x - x) < 1e-9 && Math.abs(a.tail.rotation.z - tz) < 1e-9);
  a.legs.forEach((l, i) => assert.ok(Math.abs(l.rotation.x - lx[i]) < 1e-9));
});

test('only pet cats do it', () => {
  const w = cat(false);
  assert.equal(M.updatePetCatTic(w, dt, 0, false), null);
  assert.equal(M.kneads(w), false);
});
