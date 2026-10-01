import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as B from './bat-jitter.js';

const dt = 1 / 60;
function mon(name, symbol = 'B') { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 1}); a.species = name; return a; }
const pose = a => [...a.batLift.position.toArray(), ...a.batLift.rotation.toArray().slice(0, 3)];
const kinds = ['bat', 'giant bat', 'vampire bat'];

test('bats, giant bats and vampire bats jitter; others do not', () => {
  for (const name of kinds) {
    const a = mon(name);
    assert.equal(a.batJitter, name);
    assert.ok(a.batLift?.isGroup && a.batLift.parent === a.body);
    assert.equal(a.wings.length, 2);
    assert.ok(B.updateBatJitter(a, dt, 0, false), name);
  }
  assert.equal(mon('unknown b').batJitter, 'bat');
  for (const [name, s] of [['raven', 'B'], ['newt', ':'], ['jackal', 'd']]) assert.equal(B.updateBatJitter(mon(name, s), dt, 0, false), null, name);
});

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .005) {
    const s = B.swoopPose(u);
    assert.ok(s.drop >= -.3 && s.drop <= 1 && s.glide >= 0 && s.glide <= 1 && s.climb >= 0 && s.climb <= 1, `${u}`);
    for (const v of [B.feintPose(u), B.bitePose(u)]) assert.ok(v >= 0 && v <= 1, `${u}`);
  }
  assert.deepEqual(B.swoopPose(1), {drop: 0, glide: 0, climb: 0});
  assert.equal(B.feintPose(1), 0);
  assert.equal(B.bitePose(1), 0);
});

test('it flits, swoops when alone, feints when the hero is near, and stays aloft and finite', () => {
  for (const name of kinds) {
    const a = mon(name), rest = a.batLift.position.y;
    let moved = 0, swoops = 0, feints = 0, low = Infinity, lastSwoop = null, lastFeint = null;
    const hero = new THREE.Vector3(2, 0, 2);
    for (let i = 0; i < 60 * 40; i++) {
      const near = i > 60 * 20;
      a.wings.forEach((w, k) => w.rotation.z = (k ? 1 : -1) * Math.sin(i * dt * 14) * .65);
      const st = updateFidget(a, dt, i * dt, false, near ? hero : null) && a.batJitter_ || a.batJitter_;
      for (const v of [...pose(a), ...a.wings.map(w => w.rotation.z)]) assert.ok(Number.isFinite(v), name);
      moved = Math.max(moved, a.batLift.position.distanceTo(new THREE.Vector3(0, rest, 0)));
      low = Math.min(low, a.batLift.position.y);
      if (st.swoop != null && lastSwoop == null) swoops++;
      if (st.feint != null && lastFeint == null) feints++;
      lastSwoop = st.swoop; lastFeint = st.feint;
      for (const w of a.wings) assert.ok(Math.abs(w.rotation.z) < 1.4, `${name} wing ${w.rotation.z}`);
      assert.ok(Math.abs(a.batLift.rotation.z) < 1.3 && Math.abs(a.batLift.rotation.x) < 1.1, name);
    }
    assert.ok(moved > .03 && moved < .5, `${name} moved ${moved}`);
    assert.ok(low >= B.MIN_LIFT, `${name} low ${low}`);
    assert.ok(swoops >= 2, `${name} swoops ${swoops}`);
    assert.ok(feints >= 2, `${name} feints ${feints}`);
  }
});

test('a giant bat beats slower than a bat', () => {
  assert.ok(B.LOOKS['giant bat'].beat < B.LOOKS.bat.beat);
});

test('a blow tumbles it, and death eases it to the exact rest pose and hands the wings back', () => {
  const a = mon('giant bat'), rest = pose(a);
  for (let i = 0; i < 90; i++) B.updateBatJitter(a, dt, i * dt, false);
  a.actions = {current: {kind: 'hit'}, queue: [], age: 0, u: .1};
  B.updateBatJitter(a, dt, 1.5, true);
  let roll = 0;
  for (let i = 0; i < 30; i++) { B.updateBatJitter(a, dt, 1.5 + i * dt, true); roll = Math.max(roll, Math.abs(a.batLift.rotation.z)); }
  assert.ok(roll > .2, `tumble ${roll}`);
  a.actions = {current: null, queue: [], dead: true};
  for (let i = 0; i < 300; i++) B.updateBatJitter(a, dt, 2 + i * dt, true);
  pose(a).forEach((v, i) => assert.ok(Math.abs(v - rest[i]) < 1e-9, `rest ${i}: ${v} vs ${rest[i]}`));
  a.wings[0].rotation.z = .5;
  B.updateBatJitter(a, dt, 9, true);
  assert.equal(a.wings[0].rotation.z, .5, 'live.js keeps the wings once it is at rest');
});
