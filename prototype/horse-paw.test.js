import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './horse-paw.js';

const dt = 1 / 60;
const mon = (name, sym = 'u') => { const a = createCreature({name, symbol: sym.charCodeAt(0), color: 1}); a.species = name; return a; };

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.pawPose(u);
    for (const k of Object.keys(p)) assert.ok(Math.abs(p[k]) <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.pawPose(u))) assert.equal(v, 0);
});

test('the leg rakes while raised, then the stamp dips the body', () => {
  assert.ok(M.pawPose(.3).lift > .95);
  let swing = 0;
  for (let u = .2; u < .6; u += .005) swing = Math.max(swing, Math.abs(M.pawPose(u).rake));
  assert.ok(swing > .9);
  assert.ok(M.pawPose(.72).dip > .95 && M.pawPose(.72).lift < .05);
});

test('a standing pony paws now and then, stays in bounds and ends exactly at rest', () => {
  const a = mon('pony'), lx = a.legs.map(l => l.rotation.x), bx = a.body.rotation.x, tz = a.tail.rotation.z;
  assert.ok(M.paws(a));
  let seen = 0;
  for (let i = 0; i < 60 * 80; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.horsePaw?.s != null) seen++;
    a.legs.forEach((l, k) => assert.ok(Math.abs(l.rotation.x - lx[k]) <= M.LIFT + M.RAKE + 1e-9));
    assert.ok(Math.abs(a.body.rotation.x - bx) <= M.DIP + 1e-9 && Math.abs(a.tail.rotation.z - tz) <= M.LASH + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  a.legs.forEach((l, k) => assert.ok(Math.abs(l.rotation.x - lx[k]) < 1e-9));
  assert.ok(Math.abs(a.body.rotation.x - bx) < 1e-9 && Math.abs(a.tail.rotation.z - tz) < 1e-9);
});

test('only horses and unicorns do it', () => {
  assert.equal(M.updateHorsePaw(mon('newt', ':'), dt, 0, false), null);
  assert.equal(M.paws(mon('newt', ':')), false);
  assert.ok(M.paws(mon('white unicorn')));
});
