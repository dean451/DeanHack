import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './snake-taste.js';

const dt = 1 / 60;
const mon = name => { const a = createCreature({name, symbol: 'S'.charCodeAt(0), color: 1}); a.species = name; return a; };

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.tastePose(u);
    for (const k of Object.keys(p)) assert.ok(p[k] >= 0 && p[k] <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.tastePose(u))) assert.equal(v, 0);
});

test('the jaw hangs open after the head has cocked, and both shut together', () => {
  assert.ok(M.tastePose(.3).gape < M.tastePose(.6).gape);
  assert.ok(M.tastePose(.6).cock > .99);
  assert.ok(M.tastePose(.85).gape < .01);
});

test('a lying snake does it now and then, stays in bounds and ends exactly at rest', () => {
  const a = mon('snake'), head = a.jaw.parent, y = head.rotation.y, z = head.rotation.z, g = a.jaw.rotation.x;
  assert.ok(M.tastes(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.snakeTaste?.s != null) seen++;
    assert.ok(Math.abs(head.rotation.y - y) <= M.COCK + 1e-9 && Math.abs(head.rotation.z - z) <= M.TILT + 1e-9);
    assert.ok(a.jaw.rotation.x - g >= -1e-9 && a.jaw.rotation.x - g <= M.GAPE + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(head.rotation.y - y) < 1e-9 && Math.abs(head.rotation.z - z) < 1e-9 && Math.abs(a.jaw.rotation.x - g) < 1e-9);
});

test('cobras and other species are left alone', () => {
  assert.equal(M.tastes(mon('cobra')), false);
  assert.equal(M.updateSnakeTaste(mon('jackal'), dt, 0, false), null);
});
