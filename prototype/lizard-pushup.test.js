import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './lizard-pushup.js';

const dt = 1 / 60;
const mon = name => { const a = createCreature({name, symbol: ':'.charCodeAt(0), color: 1}); a.species = name; return a; };

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.pushupPose(u);
    for (const k of Object.keys(p)) assert.ok(Math.abs(p[k]) <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.pushupPose(u))) assert.equal(v, 0);
});

test('two separate lifts with a freeze between the second and the end', () => {
  let peaks = 0, was = 0;
  for (let u = 0; u <= 1; u += .002) { const l = M.pushupPose(u).lift; if (l >= .99 && was < .99) peaks++; was = l; }
  assert.equal(peaks, 2);
});

test('a standing newt does it now and then, stays in bounds and ends exactly at rest', () => {
  const a = mon('newt'), x = a.head.rotation.x, z = a.tail.rotation.z;
  assert.ok(M.pushes(a));
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.lizardPushup?.s != null) seen++;
    assert.ok(a.head.rotation.x - x >= -M.LIFT - 1e-9 && a.head.rotation.x - x <= 1e-9);
    assert.ok(Math.abs(a.tail.rotation.z - z) <= M.TWITCH + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.x - x) < 1e-9 && Math.abs(a.tail.rotation.z - z) < 1e-9);
});

test('crocodiles and other species are left alone', () => {
  assert.equal(M.pushes(mon('crocodile')), false);
  assert.equal(M.updateLizardPushup(mon('jackal'), dt, 0, false), null);
});
