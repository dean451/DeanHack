import test from 'node:test';
import assert from 'node:assert/strict';
import {clotPose, smearPose, isWipeMessage, createTowelWipe, WIPE} from './towel-wipe.js';

test('only the glop message triggers it', () => {
  assert.ok(isWipeMessage("You've got the glop off."));
  for (const t of ['You wipe your face.', 'The towel is wet.', null]) assert.ok(!isWipeMessage(t), String(t));
});

test('every part starts and ends hidden and stays in bounds', () => {
  for (const t of [0, WIPE.total]) {
    assert.equal(smearPose(t).alpha, 0);
    for (let i = 0; i < WIPE.clots; i++) assert.equal(clotPose(i, t).alpha, 0);
  }
  for (let t = 0; t <= WIPE.total; t += .005) {
    for (let i = 0; i < WIPE.clots; i++) { const p = clotPose(i, t); assert.ok(p.y >= 0 && p.y <= 1.1 && Math.abs(p.x) <= .25 && p.alpha >= 0 && p.alpha <= 1, `${i} ${t}`); }
    const s = smearPose(t); assert.ok(s.scale > 0 && s.scale <= .25 && s.alpha >= 0 && s.alpha <= .32);
  }
});

test('clots fall, clot 0 clings longest, and the smear comes last', () => {
  for (let i = 0; i < WIPE.clots; i++) { let last = Infinity; for (let t = .3; t < .7; t += .01) { const p = clotPose(i, t); if (p.alpha > 0 && t > .5) { assert.ok(p.y <= last + 1e-9); last = p.y; } } }
  assert.equal(clotPose(0, .15).alpha, 0);
  assert.ok(clotPose(1, .15).alpha > 0);
  assert.equal(smearPose(.2).alpha, 0);
  assert.ok(smearPose(.5).alpha > 0);
});

test('a wipe starts an effect that is cleaned up', () => {
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}}; this.rotation = {}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createTowelWipe(THREE, {add() {}, remove() {}});
  fx.message("You've got the glop off.", 1, 2);
  assert.equal(fx.active, 1);
  fx.update(WIPE.total + .1);
  assert.equal(fx.active, 0);
});
