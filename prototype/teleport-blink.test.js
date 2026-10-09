import test from 'node:test';
import assert from 'node:assert/strict';
import {flashPose, streakPose, arrivePose, isTeleportMessage, createTeleportBlink, BLINK, GRAND} from './teleport-blink.js';

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

test('the arrival ring gutters for an instant before it recovers', () => {
  const at = k => arrivePose(BLINK.arrive * k).ringAlpha;
  assert.ok(at(.31) < at(.25) * .5, 'dip');
  assert.ok(at(.45) > at(.25), 'recovers');
});

test('a same-level teleport blinks out, then arrives a beat later, and leaves nothing behind', () => {
  const made = [];
  const THREE = new Proxy({}, {get: (_, k) => k === 'DoubleSide' ? 2 : class { constructor() { this.position = {set() {}}; this.scale = {set() {}, setScalar() {}}; this.rotation = {}; this.material = {}; this.visible = true; this.children = []; } add(c) { this.children.push(c); } dispose() {} }});
  const parent = {add: g => made.push(g), remove: g => made.splice(made.indexOf(g), 1)};
  const fx = createTeleportBlink(THREE, parent);
  fx.hop({x: 1, z: 2}, {x: 8, z: 9});
  assert.equal(fx.active, 1);
  fx.update(BLINK.flash * 2 + .01);
  assert.equal(fx.active, 2);
  for (let i = 0; i < 100; i++) fx.update(.05);
  assert.equal(fx.active, 0);
  assert.equal(made.length, 0);
});

test('a teleport trap arrives grander and slower than a plain hop, and still leaves nothing behind', () => {
  const made = [];
  const THREE = new Proxy({}, {get: (_, k) => k === 'DoubleSide' ? 2 : class { constructor() { this.position = {set() {}}; this.scale = {set() {}, setScalar() {}}; this.rotation = {}; this.material = {}; this.visible = true; this.children = []; } add(c) { this.children.push(c); } dispose() {} }});
  const parent = {add: g => made.push(g), remove: g => made.splice(made.indexOf(g), 1)};
  const run = trap => { const fx = createTeleportBlink(THREE, parent); fx.hop({x: 0, z: 0}, {x: 5, z: 5}, trap); let t = 0; while (fx.active && t < 5) { fx.update(.01); t += .01; } return t; };
  const plain = run(false), grand = run(true);
  assert.ok(grand > plain + .1, 'longer');
  assert.ok(GRAND.size > 1 && GRAND.time > 1 && grand < 5);
  assert.equal(made.length, 0);
});

test('the departing column stutters as it tears free, and never exceeds its peak', () => {
  let dips = 0, prev = streakPose(.1).alpha;
  for (let t = .07; t < .24; t += .002) { const a = streakPose(t).alpha; if (a < prev * .6) dips++; prev = a; assert.ok(a <= .9 + 1e-9); }
  assert.ok(dips >= 2, 'flickers');
  assert.equal(streakPose(.02).alpha, streakPose(.02).alpha);
});

test('the landing flash stutters once as it dies', () => {
  const at = f => arrivePose(BLINK.arrive * (.6 + .4 * f)).flashAlpha;
  assert.ok(at(.38) < at(.25) * .5, 'dip');
  assert.ok(at(.38) < at(.5) * 1.5 + 1e-9 || at(.5) > 0);
  assert.ok(at(.2) > at(.5), 'still dying overall');
});

test('the departure flash gutters mid-fade, then still ends at nothing', () => {
  assert.ok(flashPose(BLINK.flash * .47).alpha < flashPose(BLINK.flash * .35).alpha * .5);
  assert.ok(flashPose(BLINK.flash * .6).alpha > 0);
  assert.equal(flashPose(BLINK.flash).alpha, 0);
});
