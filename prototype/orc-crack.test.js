import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './orc-crack.js';

const dt = 1 / 60;
const mon = (name, sym = 'o') => { const a = createCreature({name, symbol: sym.charCodeAt(0), color: 1}); a.species = name; return a; };

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.crackPose(u);
    for (const k of Object.keys(p)) assert.ok(Math.abs(p[k]) <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.crackPose(u))) assert.equal(v, 0);
});

test('the head rolls one way slowly, then snaps hard the other', () => {
  assert.ok(M.crackPose(.45).cant > .8);
  assert.ok(M.crackPose(.62).cant < -.5);
});

test('a standing hill orc does it now and then, stays in bounds and ends exactly at rest', () => {
  const a = mon('hill orc'), z = a.head.rotation.z, y = a.head.rotation.y, b = a.body.rotation.z;
  assert.ok(M.cracks(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.orcCrack?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.z - z) <= M.CANT + 1e-9 && Math.abs(a.head.rotation.y - y) <= M.GLOWER + 1e-9);
    assert.ok(Math.abs(a.body.rotation.z - b) <= M.JOLT + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.z - z) < 1e-9 && Math.abs(a.head.rotation.y - y) < 1e-9 && Math.abs(a.body.rotation.z - b) < 1e-9);
});

test('only orcs do it', () => {
  assert.equal(M.updateOrcCrack(mon('newt', ':'), dt, 0, false), null);
  assert.equal(M.cracks(mon('newt', ':')), false);
});
