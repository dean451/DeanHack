import test from 'node:test';
import assert from 'node:assert/strict';
import {crownPose, glintPose, isThroneGiftMessage, createThroneGift, GIFT} from './throne-gift.js';

test('only the throne\'s good-mood voice triggers it', () => {
  assert.ok(isThroneGiftMessage("A voice echoes: \"Thy audience pleaseth me.\""));
  assert.ok(isThroneGiftMessage('A voice booms out "Thou hast pleased me with thy presence."'));
  for (const t of ['You feel a wrenching sensation.', 'You sit on the throne.', null]) assert.ok(!isThroneGiftMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, GIFT.total]) {
    assert.equal(crownPose(t).alpha, 0);
    for (let i = 0; i < GIFT.glints; i++) assert.equal(glintPose(i, t).alpha, 0);
  }
});

test('the crown is lowered, hangs, then drops with a tick, in bounds', () => {
  assert.ok(crownPose(.3).y > crownPose(.6).y);
  assert.ok(Math.abs(crownPose(.7).y - crownPose(.6).y) < .02);
  assert.ok(crownPose(.62).y - crownPose(.8).y > .2);
  for (let t = .001; t < GIFT.total; t += .004) { const p = crownPose(t); assert.ok(p.y >= 1.3 && p.y <= 2.6 + 1e-9 && p.alpha >= 0 && p.alpha <= .85 + 1e-9 && p.scale > .4 && p.scale < .6, String(t)); }
});

test('glints climb, and the first one stalls then twitches, in bounds', () => {
  for (let i = 0; i < GIFT.glints; i++) {
    assert.ok(glintPose(i, 1.1).y > glintPose(i, .5).y || i === 0);
    for (let t = .01; t < GIFT.total; t += .004) { const p = glintPose(i, t); assert.ok(p.y >= 0 && p.y <= 1.8 && Math.hypot(p.x, p.z) <= .41 && p.alpha >= 0 && p.alpha <= .8 + 1e-9, `${i} ${t}`); }
  }
  assert.equal(glintPose(0, .65).y, glintPose(0, .7).y);
  assert.ok(glintPose(0, .74).y > glintPose(0, .7).y && glintPose(0, .78).y < glintPose(0, .74).y);
});

test('it plays on the hero\'s square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createThroneGift(THREE, {add() {}, remove() {}});
  fx.message('A voice echoes: "Thy audience pleaseth me."', 3, 4);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [3, 4]);
  fx.update(GIFT.total + .1); assert.equal(fx.active, 0);
  fx.message('Thy audience pleaseth me', 0, 0); fx.clear(); assert.equal(fx.active, 0);
});
