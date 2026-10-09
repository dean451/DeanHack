import test from 'node:test';
import assert from 'node:assert/strict';
import {kneelPose, kneelMessage, createPrayerKneel, KNEEL_TIME} from './prayer-kneel.js';

const rig = () => ({arm: {rotation: {x: 0, z: 0}}, elbow: {rotation: {x: 0}}, wrist: {rotation: {x: 0}}, weaponSocket: {rotation: {z: 0}},
  shieldArm: {rotation: {x: 0, z: 0}}, shieldElbow: {rotation: {x: 0}}, body: {rotation: {x: 0, y: 0}}});

test('only the start of a prayer kneels', () => {
  assert.ok(kneelMessage('You begin praying to Anhur.'));
  for (const t of ['You pray.', 'You feel that Anhur is well-pleased.', null]) assert.ok(!kneelMessage(t), String(t));
});

test('the pose starts and ends exactly at rest, bows forward and stays in bounds', () => {
  for (const u of [0, 1]) for (const v of Object.values(kneelPose(u))) assert.ok(Math.abs(v) < 1e-12);
  let lean = 0;
  for (let u = 0; u <= 1; u += .005) {
    const p = kneelPose(u);
    lean = Math.max(lean, p.lean);
    for (const v of Object.values(p)) assert.ok(Math.abs(v) < 1.2, `${u}`);
  }
  assert.ok(lean > .35 && kneelPose(.4).lean > .3);
});

test('it flinches once: the lean eases back for a beat mid-hold', () => {
  assert.ok(kneelPose(.655).lean < kneelPose(.55).lean - .05);
});

test('it sneaks a look up early in the hold, then ducks lower than the bow it started from', () => {
  assert.ok(kneelPose(.32).lean < kneelPose(.24).lean - .05);
  const top = (a, b) => { let m = -1; for (let u = a; u <= b; u += .005) m = Math.max(m, kneelPose(u).lean); return m; };
  assert.ok(top(.42, .58) > top(.18, .26) + .03);
});

test('playing layers on the rig, restores it and yields to actions', () => {
  const a = rig(), k = createPrayerKneel();
  assert.ok(!k.message('You hit the newt.'));
  assert.ok(k.message('You begin praying to Anhur.'));
  for (let i = 0; i < 6; i++) k.update(a, .1);
  assert.ok(a.body.rotation.x > .3 && k.playing);
  k.update(a, .1, true);
  assert.equal(a.body.rotation.x, 0);
  assert.ok(!k.playing);
  k.message('You begin praying to Anhur.');
  for (let i = 0; i < KNEEL_TIME * 10 + 3; i++) k.update(a, .1);
  for (const v of [a.body.rotation.x, a.body.rotation.y, a.arm.rotation.x, a.shieldArm.rotation.x, a.elbow.rotation.x]) assert.ok(Math.abs(v) < 1e-9);
  assert.ok(!k.playing);
  k.message('You begin praying to Anhur.'); k.update(a, .6); k.clear(a);
  assert.ok(Math.abs(a.body.rotation.x) < 1e-9 && !k.playing);
});

test('rising, the hero glances once over the shoulder, then faces front', () => {
  let min = 0; for (let u = .8; u <= 1; u += .002) min = Math.min(min, kneelPose(u).twist);
  assert.ok(min < -.15, String(min));
  assert.ok(Math.abs(kneelPose(.85).twist) < 1e-9 && Math.abs(kneelPose(.97).twist) < 1e-9);
});
