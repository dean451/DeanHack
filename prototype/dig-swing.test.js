import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {digSwingPose, spentPose, finishMessage, SPENT_TIME, createDigSwing, digMessage, DIG_TIME, BITE_U, TIRE_BLOWS, CHAIN_GAP} from './dig-swing.js';

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

test('the finishing strike leaves the hero spent: slack, heaving, one tic, then rest', () => {
  for (const m of ['You dig a pit in the floor.', 'You dig a hole through the floor.', 'You succeed in cutting away some rock.', 'You make an opening in the wall.']) assert.ok(finishMessage(m), m);
  for (const m of ['You hit the rock with all your might.', 'You dig a pit', null]) assert.ok(!finishMessage(m), String(m));
  for (const u of [0, 1]) for (const f of FIELDS) assert.equal(spentPose(u)[f], 0, `${f}@${u}`);
  for (let u = 0; u <= 1; u += .01) for (const f of FIELDS) {
    const v = spentPose(u)[f];
    assert.ok(Number.isFinite(v) && Math.abs(v) < 1, `${f}@${u}=${v}`);
  }
  assert.ok(spentPose(.4).lean > .2, 'sagging forward');
  assert.ok(spentPose(.64).twist < spentPose(.5).twist - .1, 'the tic snaps the twist');
  assert.deepEqual(spentPose(NaN), spentPose(1));
  const a = rig(), before = snap(a), d = createDigSwing();
  d.message('You hit the rock with all your might.');
  assert.ok(d.message('You make an opening in the wall.'));
  let moved = false;
  for (let t = 0; t < SPENT_TIME + .3; t += 1 / 60) {
    d.update(a, 1 / 60);
    if (snap(a).some((v, i) => Math.abs(v - before[i]) > .1)) moved = true;
  }
  d.update(a, 1 / 60);
  assert.ok(moved && !d.playing);
  snap(a).forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-9, `joint ${i}`));
});

test('the free hand hauls up with the tool and flings back on the bite', () => {
  assert.ok(digSwingPose(.34).offArm < -.4, 'raised at the top');
  assert.ok(digSwingPose(BITE_U).offArm > .25, 'flung back at the bite');
  assert.ok(digSwingPose(.8).offArm < digSwingPose(BITE_U).offArm, 'eases back to rest');
  for (const u of [0, 1]) assert.equal(spentPose(u).offArm, 0);
  const a = rig(), d = createDigSwing();
  d.message('You hit the rock with all your might.');
  let moved = false;
  for (let t = 0; t < DIG_TIME * .4; t += 1 / 60) { d.update(a, 1 / 60); if (Math.abs(a.shieldArm.rotation.x) > .3) moved = true; }
  assert.ok(moved, 'the off-hand arm really moves');
  d.clear(a);
  assert.equal(a.shieldArm.rotation.x, 0);
});

test('a long dig tires the hero: later blows lift less, slump more and still return to rest', () => {
  const fresh = digSwingPose(.34), tired = digSwingPose(.34, 1);
  assert.ok(Math.abs(tired.arm) < Math.abs(fresh.arm), 'lifts less');
  assert.ok(digSwingPose(.5, 1).lean > digSwingPose(.5, 0).lean, 'slumps forward');
  for (const t of [0, .5, 1]) for (let u = 0; u <= 1; u += .01) for (const f of FIELDS) {
    const v = digSwingPose(u, t)[f];
    assert.ok(Number.isFinite(v) && Math.abs(v) < 3.2, `${f}@${u},${t}`);
  }
  for (const f of FIELDS) { assert.equal(digSwingPose(0, 1)[f], 0); assert.equal(digSwingPose(1, 1)[f], 0); }
  assert.deepEqual(digSwingPose(.3, NaN), digSwingPose(.3, 0));
});

test('chained blows build fatigue, a pause or a new level starts fresh', () => {
  const a = rig(), d = createDigSwing(), blow = 'You hit the rock with all your might.';
  for (let i = 0; i < TIRE_BLOWS + 3; i++) {
    d.message(blow);
    for (let t = 0; t < DIG_TIME + .1; t += 1 / 30) d.update(a, 1 / 30);
    assert.equal(d.chain, Math.min(i, TIRE_BLOWS));
  }
  for (let t = 0; t < CHAIN_GAP + .5; t += .1) d.update(a, .1);
  d.message(blow);
  assert.equal(d.chain, 0);
  d.message(blow); d.clear(a); d.message(blow);
  assert.equal(d.chain, 0);
});
