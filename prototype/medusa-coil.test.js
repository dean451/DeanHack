import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {tailSway} from './tail-sway.js';
import * as M from './medusa-coil.js';

const dt = 1 / 60;
function medusa() { const a = createCreature({name: 'medusa'}); a.species = 'medusa'; return a; }
const pose = a => [a.body.rotation.x, a.body.rotation.y, a.body.rotation.z, a.head.rotation.x, a.head.rotation.y, a.head.rotation.z, a.head.position.z];
const tailGeo = a => a.tail.children.find(m => m.isMesh).geometry;

test('only Medusa coils, and she gets her own tail geometry', () => {
  for (const name of ['snake', 'cobra', 'guardian naga', 'nymph']) {
    const a = createCreature({name}); a.species = name;
    assert.equal(M.updateMedusaCoil(a, dt, 0, false), null, name);
  }
  const a = medusa(), b = medusa(), shared = tailGeo(a);
  assert.equal(shared, tailGeo(b));
  const st = M.updateMedusaCoil(a, dt, 0, false);
  assert.ok(st.mesh && st.map && st.eyes);
  assert.notEqual(tailGeo(a), shared, 'cloned');
  assert.equal(tailGeo(b), shared);
  assert.ok(st.map.s.some(s => s > .95) && st.map.s.some(s => s < .05), 'the tail spans root to tip');
  assert.equal(tailSway(a, 1.3), 0, 'live.js leaves her tail flat');
});

test('helpers stay in bounds', () => {
  for (let s = 0; s <= 1.0001; s += .02) {
    assert.ok(Math.abs(M.wave(s, 1.7, M.AMP)) <= M.AMP + 1e-9);
    const k = M.tipShare(s); assert.ok(k >= 0 && k <= 1);
  }
  assert.equal(Math.abs(M.wave(0, 3, 1)), 0, 'the root never moves');
  assert.equal(M.tipShare(.3), 0);
  assert.equal(M.tipShare(1), 1);
  for (let u = 0; u <= 1.0001; u += .01) assert.ok(Math.abs(M.lashCurve(u)) <= 1);
  assert.equal(M.lashCurve(0), 0); assert.equal(M.lashCurve(1), 0);
});

test('the tail waves, lifts its tip at the hero, lashes, and everything rests after death', () => {
  const a = medusa(), rest = pose(a), restTail = Float32Array.from(tailGeo(a).attributes.position.array);
  let t = 0;
  const run = (secs, look, each) => { for (let i = 0; i < secs * 60; i++) { t += dt; M.updateMedusaCoil(a, dt, t, !!a.actions, look); each?.(); } };
  const tailMove = () => {
    const p = tailGeo(a).attributes.position.array; let side = 0, up = 0, down = 0;
    for (let i = 0; i < p.length; i += 3) {
      side = Math.max(side, Math.hypot(p[i] - restTail[i], p[i + 2] - restTail[i + 2]));
      up = Math.max(up, p[i + 1] - restTail[i + 1]); down = Math.min(down, p[i + 1] - restTail[i + 1]);
    }
    assert.ok(p.every(Number.isFinite));
    return {side, up, down};
  };
  // alone: a gentle wave, the tip on the floor, eyes dark
  let alone = 0;
  run(6, null, () => { const m = tailMove(); alone = Math.max(alone, m.side); assert.ok(m.up < 1e-6 && m.down > -1e-6); });
  assert.ok(alone > .02 && alone <= M.AMP + 1e-6, `alone ${alone}`);
  assert.equal(a.medusaCoil.eyes.visible, false);
  // the hero near, off to her right: she turns, the tip lifts, the eyes smoulder
  const look = new THREE.Vector3(2, 0, 1.5);
  let near = 0, lift = 0;
  run(5, look, () => { const m = tailMove(); near = Math.max(near, m.side); lift = Math.max(lift, m.up); });
  assert.ok(near > alone && near < M.AMP_NEAR + M.QUIVER + 1e-3, `near ${near}`);
  assert.ok(lift > M.TIP_LIFT * .6 && lift <= M.TIP_LIFT + 1e-6, `lift ${lift}`);
  const turned = a.body.rotation.y - rest[1] + a.head.rotation.y - rest[4];
  assert.ok(turned > .5, `turns to the hero ${turned}`);
  assert.ok(a.medusaCoil.eyes.visible && a.medusaCoil.eyes.material.opacity > .3);
  // a gaze: the eyes flare, the head thrusts; then a lash with a claw
  a.actions = {current: {kind: 'attack', attack: 'gaze'}, queue: [], age: 1, u: 0};
  let flare = 0, thrust = 0;
  run(.42, look, () => { a.actions.u = Math.min(1, a.actions.u + dt / .42); flare = Math.max(flare, a.medusaCoil.glow); thrust = Math.max(thrust, a.head.position.z - rest[6]); });
  assert.ok(flare > .9 && thrust > .025, `flare ${flare} thrust ${thrust}`);
  a.actions = {current: {kind: 'attack', attack: 'claw'}, queue: [], age: 1, u: 0};
  let lash = 0;
  run(.42, look, () => { a.actions.u = Math.min(1, a.actions.u + dt / .42); lash = Math.max(lash, tailMove().side); });
  assert.ok(lash > near, `lash ${lash}`);
  a.actions = {current: {kind: 'hit', attack: 'weapon'}, queue: [], age: 1, u: .5};
  run(.3, look); assert.ok(a.medusaCoil.thrash > .4);
  // death: everything eases back to rest and stays there
  a.actions = {current: null, queue: [], dead: true};
  run(5, look);
  const end = tailMove();
  assert.ok(end.side < 1e-3 && end.up < 1e-3, `tail rests ${end.side} ${end.up}`);
  pose(a).forEach((v, i) => assert.ok(Math.abs(v - rest[i]) < 1e-3, `pose ${i}: ${v} vs ${rest[i]}`));
  assert.equal(a.medusaCoil.eyes.visible, false);
  const still = Float32Array.from(tailGeo(a).attributes.position.array);
  run(1, look);
  assert.deepEqual(Float32Array.from(tailGeo(a).attributes.position.array), still, 'holds still');
});
