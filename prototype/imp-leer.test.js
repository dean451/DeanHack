import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './imp-leer.js';

const dt = 1 / 60;
const mon = (name, sym = 'i') => { const a = createCreature({name, symbol: sym.charCodeAt(0), color: 1}); a.species = name; return a; };

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.leerPose(u);
    for (const k of Object.keys(p)) assert.ok(Math.abs(p[k]) <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.leerPose(u))) assert.equal(v, 0);
});

test('the head jerks one way, then back past centre', () => {
  assert.ok(M.leerPose(.3).dart > .9);
  assert.ok(M.leerPose(.7).dart < -.2);
});

test('a standing imp does it now and then, stays in bounds and ends exactly at rest', () => {
  const a = mon('imp'), z = a.head.rotation.z, y = a.head.rotation.y, b = a.tail.rotation.z;
  assert.ok(M.leers(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.impLeer?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.z - z) <= M.TILT + 1e-9 && Math.abs(a.head.rotation.y - y) <= M.DART + 1e-9);
    assert.ok(Math.abs(a.tail.rotation.z - b) <= M.LASH + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.z - z) < 1e-9 && Math.abs(a.head.rotation.y - y) < 1e-9 && Math.abs(a.tail.rotation.z - b) < 1e-9);
});

test('only imps do it', () => {
  assert.equal(M.updateImpLeer(mon('newt', 'i'), dt, 0, false), null);
  assert.equal(M.leers(mon('newt', 'i')), false);
});
