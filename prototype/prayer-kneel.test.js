import test from 'node:test';
import assert from 'node:assert/strict';
import {kneelPose, kneelMessage, createPrayerKneel, KNEEL_TIME, LEG_FOLD, BODY_DROP} from './prayer-kneel.js';

const rig = () => ({arm: {rotation: {x: 0, z: 0}}, elbow: {rotation: {x: 0}}, wrist: {rotation: {x: 0}}, weaponSocket: {rotation: {z: 0}},
  shieldArm: {rotation: {x: 0, z: 0}}, shieldElbow: {rotation: {x: 0}}, body: {rotation: {x: 0, y: 0}, position: {y: 0}},
  head: {rotation: {x: 0}}, legs: [{rotation: {x: 0}}, {rotation: {x: 0}}]});

test('only the start of a prayer kneels', () => {
  assert.ok(kneelMessage('You begin praying to Anhur.'));
  for (const t of ['You pray.', 'You feel that Anhur is well-pleased.', null]) assert.ok(!kneelMessage(t), String(t));
});

test('the pose starts and ends exactly at rest, bows slightly and stays in bounds', () => {
  for (const u of [0, 1]) for (const v of Object.values(kneelPose(u))) assert.ok(Math.abs(v) < 1e-12);
  let lean = 0;
  for (let u = 0; u <= 1; u += .005) {
    const p = kneelPose(u);
    lean = Math.max(lean, p.lean);
    for (const v of Object.values(p)) assert.ok(Math.abs(v) < 1.2, `${u}`);
  }
  // a devout bow: the back stays nearly straight
  assert.ok(lean > .1 && lean < .2 && kneelPose(.4).lean > .1, String(lean));
});

test('it kneels on both knees: the legs fold back and the body drops so the knees meet the floor, the head bows', () => {
  const p = kneelPose(.4);
  assert.ok(p.leg > 1 && p.drop > .25 && p.head > .3, JSON.stringify(p));
  // a .47 leg folded by LEG_FOLD rests its end at the floor once the body has dropped BODY_DROP
  const hip = .47 - BODY_DROP, foot = hip - .47 * Math.cos(LEG_FOLD);
  assert.ok(Math.abs(foot) < .02, String(foot));
  for (const u of [0, 1]) assert.equal(kneelPose(u).leg, 0);
});

test('the legs and height are added fresh each frame, as the render loop rewrites them; the rest is taken back', () => {
  const a = rig(), k = createPrayerKneel();
  k.message('You begin praying to Anhur.');
  for (let i = 0; i < 8; i++) { a.legs.forEach(l => l.rotation.x = 0); a.body.position.y = 0; k.update(a, .1); }
  assert.ok(a.legs[0].rotation.x > 1 && a.legs[1].rotation.x > 1 && a.body.position.y < -.25 && a.head.rotation.x > .3);
  // the next frame's rewrite is the only thing that resets them; the tracked offsets come off on their own
  a.legs.forEach(l => l.rotation.x = 0); a.body.position.y = 0;
  k.update(a, .1, true);
  assert.equal(a.legs[0].rotation.x, 0); assert.equal(a.body.position.y, 0);
  assert.ok(Math.abs(a.head.rotation.x) < 1e-9 && Math.abs(a.body.rotation.x) < 1e-9);
});

test('calm and devout: the hands meet at the chest, the head bows, and the hold is still', () => {
  const p = kneelPose(.5);
  // both arms draw in alike, so the hands meet
  assert.ok(Math.abs(p.arm - p.offArm) < .1 && Math.abs(p.elbow - p.offElbow) < .1 && p.arm < -.6, JSON.stringify(p));
  assert.ok(p.head > .4);
  // no twist, peek or flinch: nothing turns, and the lean moves only with a slow breath
  for (let u = 0; u <= 1; u += .002) assert.equal(kneelPose(u).twist, 0);
  for (let u = .25; u <= .75; u += .002) assert.ok(Math.abs(kneelPose(u + .002).lean - kneelPose(u).lean) < .002, String(u));
});

test('the head settles a little lower as the prayer goes on', () => {
  assert.ok(kneelPose(.7).head > kneelPose(.25).head + .05);
});

test('playing layers on the rig, restores it and yields to actions', () => {
  const a = rig(), k = createPrayerKneel();
  assert.ok(!k.message('You hit the newt.'));
  assert.ok(k.message('You begin praying to Anhur.'));
  for (let i = 0; i < 6; i++) k.update(a, .1);
  assert.ok(a.body.rotation.x > .1 && k.playing);
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

test('the rise is unhurried: the last fifth eases back to standing', () => {
  assert.ok(kneelPose(.85).leg > LEG_FOLD * .7 && kneelPose(.95).leg > .05 && kneelPose(.95).leg < LEG_FOLD * .3);
});
