import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {digSwingPose, createDigSwing, digMessage, DIG_TIME, BITE_U} from './dig-swing.js';

const FIELDS = ['arm', 'armZ', 'elbow', 'wrist', 'socket', 'shield', 'twist', 'lean', 'offArm', 'offElbow'];
const rig = () => ({arm: new THREE.Object3D(), elbow: new THREE.Object3D(), wrist: new THREE.Object3D(),
  weaponSocket: new THREE.Object3D(), shieldArm: new THREE.Object3D(), shieldElbow: new THREE.Object3D(), body: new THREE.Object3D()});
const snap = a => Object.values(a).flatMap(o => [o.rotation.x, o.rotation.y, o.rotation.z]);

test('only the dig blow message triggers it', () => {
  assert.ok(digMessage('You hit the rock with all your might.'));
  for (const t of ['You hit the newt.', 'You dig a pit in the floor.', null, 3]) assert.ok(!digMessage(t), String(t));
});

test('the pose starts and ends exactly at rest and stays in bounds', () => {
  for (const u of [0, 1]) for (const f of FIELDS) assert.equal(digSwingPose(u)[f], 0, `${f}@${u}`);
  for (let u = 0; u <= 1; u += .01) for (const f of FIELDS) {
    const v = digSwingPose(u)[f];
    assert.ok(Number.isFinite(v) && Math.abs(v) < 3.2, `${f}@${u}=${v}`);
  }
  assert.deepEqual(digSwingPose(NaN), digSwingPose(1));
});

test('the tool rises, hangs, then drops hard: the bite is faster than the haul', () => {
  const arm = u => digSwingPose(u).arm;
  assert.ok(arm(.34) < -2.5, 'raised high');
  assert.ok(arm(BITE_U) > arm(.34) + 1.5, 'comes down');
  const haul = Math.abs(arm(.34) - arm(0)) / .34, drop = Math.abs(arm(BITE_U) - arm(.34)) / (BITE_U - .34);
  assert.ok(drop > haul, 'drop outpaces haul');
});

test('updating leaves the rig exactly at rest once the blow ends', () => {
  const a = rig(), before = snap(a), d = createDigSwing();
  assert.ok(d.message('You hit the rock with all your might.'));
  let moved = false;
  for (let t = 0; t < DIG_TIME + .3; t += 1 / 60) {
    d.update(a, 1 / 60);
    if (snap(a).some((v, i) => Math.abs(v - before[i]) > .1)) moved = true;
  }
  d.update(a, 1 / 60);
  assert.ok(moved);
  assert.ok(!d.playing);
  snap(a).forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-9, `joint ${i}`));
});

test('a busy hero (real swing or death) cuts it off and clear takes it back', () => {
  const a = rig(), before = snap(a), d = createDigSwing();
  d.message('You hit the rock with all your might.');
  for (let i = 0; i < 20; i++) d.update(a, 1 / 60);
  d.update(a, 1 / 60, true);
  assert.ok(!d.playing);
  snap(a).forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-9));
  d.message('You hit the rock with all your might.');
  for (let i = 0; i < 20; i++) d.update(a, 1 / 60);
  d.clear(a);
  snap(a).forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-9));
});
