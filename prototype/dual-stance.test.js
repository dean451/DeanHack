import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stancePose, updateDualStance, unposeDualStance, READY, FLARE, TREMOR} from './dual-stance.js';

function rig(dual) {
  const shieldArm = new THREE.Group(), shieldElbow = new THREE.Group();
  shieldElbow.rotation.x = -.9; shieldArm.add(shieldElbow);
  return {shieldArm, shieldElbow, dual};
}

test('the stance is nothing at rest, ready when full, and stays in bounds between', () => {
  const rest = stancePose(0, 3);
  assert.equal(rest.arm, 0); assert.equal(rest.elbow, 0);
  const full = stancePose(1, 0);
  assert.ok(Math.abs(full.arm - READY.arm) < 1e-9 && Math.abs(full.elbow - READY.elbow) < 1e-9);
  for (let k = 0; k <= 1; k += .01) for (const t of [0, .4, 1.7]) {
    const p = stancePose(k, t);
    assert.ok(Math.abs(p.arm) <= Math.abs(READY.arm) + FLARE + TREMOR + 1e-9 && Math.abs(p.elbow) < 1, `${k} ${t}`);
  }
  assert.deepEqual(stancePose(NaN, NaN), {arm: 0, elbow: 0});
});

test('the arm flares past its ready mark on the way in', () => {
  let lowest = 0;
  for (let k = .05; k < 1; k += .05) lowest = Math.min(lowest, stancePose(k, 0).arm);
  assert.ok(lowest < READY.arm - .03, `flare ${lowest}`);
});

test('wielding two weapons settles the arm into the guard, putting one away returns it exactly', () => {
  const r = rig(true);
  const restArm = r.shieldArm.rotation.x, restElbow = r.shieldElbow.rotation.x;
  for (let i = 0; i < 120; i++) { updateDualStance(r, 1 / 60, i / 60); }
  assert.ok(r.dualStance.k === 1);
  assert.ok(r.shieldArm.rotation.x < restArm - .3 && r.shieldElbow.rotation.x > restElbow + .2);
  r.dual = false;
  for (let i = 0; i < 180; i++) updateDualStance(r, 1 / 60, 2 + i / 60);
  assert.equal(r.dualStance.k, 0);
  assert.equal(r.shieldArm.rotation.x, restArm);
  assert.ok(Math.abs(r.shieldElbow.rotation.x - restElbow) < 1e-12);
});

test('each frame takes the last offsets back, so nothing accumulates, and unpose clears it', () => {
  const r = rig(true);
  for (let i = 0; i < 400; i++) updateDualStance(r, 1 / 60, i / 60);
  const a = r.shieldArm.rotation.x;
  unposeDualStance(r);
  assert.ok(Math.abs(r.shieldArm.rotation.x) < 1e-12);
  assert.ok(Math.abs(a) < Math.abs(READY.arm) + TREMOR + 1e-9);
  unposeDualStance(r); unposeDualStance(null);
  assert.ok(Math.abs(r.shieldArm.rotation.x) < 1e-12);
});

test('an actor without the off arm rig, or a bad dt, is left alone', () => {
  assert.equal(updateDualStance({dual: true}, .016), 0);
  assert.equal(updateDualStance(null, .016), 0);
  const r = rig(true);
  updateDualStance(r, NaN); updateDualStance(r, -1);
  assert.equal(r.shieldArm.rotation.x, 0);
});
