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
  const a = mon('imp'), z = a.head.rotation.z, y = a.head.rotation.y, b = a.tail.rotation.z, by = a.body.rotation.y;
  assert.ok(M.leers(a));
  let seen = 0;
  for (let i = 0; i < 60 * 60; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.impLeer?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.z - z) <= M.TILT + 1e-9 && Math.abs(a.head.rotation.y - y) <= M.DART + 1e-9);
    assert.ok(Math.abs(a.tail.rotation.z - b) <= M.LASH + 1e-9);
    assert.ok(Math.abs(a.body.rotation.y - by) <= M.TWIST + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.z - z) < 1e-9 && Math.abs(a.head.rotation.y - y) < 1e-9 && Math.abs(a.tail.rotation.z - b) < 1e-9);
  assert.ok(Math.abs(a.body.rotation.y - by) < 1e-9, 'body twist returns exactly');
});

test('only imps do it', () => {
  assert.equal(M.updateImpLeer(mon('newt', 'i'), dt, 0, false), null);
  assert.equal(M.leers(mon('newt', 'i')), false);
});

test('the hero coming close sets the leer off soon, and again while he stays', () => {
  const far = mon('imp'), near = mon('imp'), hero = {x: 2, z: 0}, away = {x: 30, z: 0};
  far.g.position.set(0, 0, 0); near.g.position.set(0, 0, 0);
  const starts = (a, look, secs) => {
    let n = 0, was = null;
    for (let i = 0; i < secs * 60; i++) {
      updateFidget(a, dt, i * dt, false, look);
      const s = a.impLeer?.s; if (s != null && was == null) n++; was = s;
    }
    return n;
  };
  assert.equal(starts(far, away, 2.5), 0, 'nobody near: it keeps to its idle timer (first leer after 3 s)');
  assert.ok(starts(near, hero, 1) >= 1, 'hero near: it leers within a second');
  assert.ok(starts(mon('imp'), hero, 12) >= 3, 'and keeps leering while he stays');
  const a = mon('imp'), y = a.head.rotation.y, b = a.body.rotation.y;
  a.g.position.set(0, 0, 0);
  for (let i = 0; i < 300; i++) updateFidget(a, dt, i * dt, false, hero);
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, hero);
  assert.ok(Math.abs(a.head.rotation.y - y) < 1e-9 && Math.abs(a.body.rotation.y - b) < 1e-9, 'busy takes it back exactly');
});

test('the first jerk turns toward the hero\'s side of the imp, and stays in bounds', () => {
  const peak = (heroPos, yaw) => {
    const a = mon('imp'); a.g.position.set(0, 0, 0); a.g.rotation.y = yaw;
    const y0 = a.head.rotation.y; let max = 0, tilt = 0, z0 = a.head.rotation.z;
    for (let i = 0; i < 180; i++) {
      updateFidget(a, dt, i * dt, false, heroPos);
      const d = a.head.rotation.y - y0;
      if (Math.abs(d) > Math.abs(max)) max = d;
      assert.ok(Math.abs(d) <= M.DART + 1e-9 && Math.abs(a.head.rotation.z - z0) <= M.TILT + 1e-9);
    }
    return max;
  };
  assert.ok(peak({x: 2, z: 0}, 0) > M.DART * .8, 'hero to the east of a south-facing imp: head turns +');
  assert.ok(peak({x: -2, z: 0}, 0) < -M.DART * .8, 'hero to the west: head turns -');
  assert.ok(peak({x: 2, z: 0}, Math.PI) < -M.DART * .8, 'imp turned round: the same hero is on the other side');
  assert.equal(M.sideToward(mon('imp'), null), 1);
  assert.equal(M.sideToward(mon('imp'), {x: NaN, z: 1}), 1);
});
