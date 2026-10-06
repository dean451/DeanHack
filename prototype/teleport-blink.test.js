import test from 'node:test';
import assert from 'node:assert/strict';
import {flashPose, streakPose, arrivePose, isTeleportMessage, createTeleportBlink, BLINK} from './teleport-blink.js';

test('only the level teleporter flash message triggers it', () => {
  assert.ok(isTeleportMessage('You are momentarily blinded by a flash of light.'));
  for (const t of ['You feel a wrenching sensation.', 'You are blinded by the flash!', null]) assert.ok(!isTeleportMessage(t), String(t));
});

test('every part starts and ends at rest, and stays in bounds', () => {
  for (const t of [0, 9]) {
    assert.equal(flashPose(t).alpha, 0); assert.equal(streakPose(t).alpha, 0);
    const a = arrivePose(t); assert.equal(a.ringAlpha, 0); assert.equal(a.flashAlpha, 0);
  }
  assert.equal(flashPose(BLINK.flash).alpha, 0); assert.equal(streakPose(BLINK.streak).alpha, 0);
  assert.equal(arrivePose(BLINK.arrive).flashAlpha, 0);
  let peak = 0;
  for (let t = 0; t <= BLINK.arrive; t += .005) {
    const s = streakPose(t), f = flashPose(t), a = arrivePose(t); peak = Math.max(peak, s.height);
    assert.ok(s.height > 0 && s.height <= 2.7 && s.width > 0 && s.width <= .24 && s.alpha >= 0 && s.alpha <= .9 + 1e-9, String(t));
    assert.ok(f.alpha >= 0 && f.alpha <= 1 && f.size <= 1.35 + 1e-9 && a.ring >= .15 - 1e-9 && a.ring <= 1.4 && a.ringAlpha <= .8 + 1e-9 && a.flashAlpha <= 1, String(t));
  }
  assert.ok(peak > 2);
});

test('the ring collapses before the arrival flash lands', () => {
  assert.ok(arrivePose(.1).ring > arrivePose(.3).ring);
  assert.equal(arrivePose(.1).flashAlpha, 0);
  assert.ok(arrivePose(BLINK.arrive * .62).flashAlpha > .5);
});

function fakeThree() {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  return {THREE, added};
}

test('the arrival flash only follows a blink, and everything finishes', () => {
  const {THREE, added} = fakeThree(), parent = {add() {}, remove() {}};
  const b = createTeleportBlink(THREE, parent);
  b.levelChanged(0, 0); assert.equal(b.active, 0, 'an ordinary level change shows nothing');
  b.message('You are momentarily blinded by a flash of light.', 2, 3);
  assert.equal(b.active, 1);
  b.levelChanged(0, 0); assert.equal(b.active, 1, 'only the arrival remains');
  for (let t = 0; t < BLINK.arrive + .2; t += 1 / 60) b.update(1 / 60);
  assert.equal(b.active, 0);
  b.message('You are momentarily blinded by a flash of light.', 0, 0); b.clear();
  b.levelChanged(0, 0); assert.equal(b.active, 0, 'clear disarms');
});
