import test from 'node:test';
import assert from 'node:assert/strict';
import {motePose, ringPose, isKillMessage, createFirstKill, KILL} from './first-kill.js';

test('only kill messages trigger it', () => {
  for (const t of ['You kill the jackal!', 'You kill it!', 'You destroy the zombie!', 'You kill Fido!']) assert.ok(isKillMessage(t), t);
  for (const t of ['You miss the jackal.', 'You hit the jackal!', 'The jackal is killed!', 'You kill', null]) assert.ok(!isKillMessage(t), String(t));
});

test('every part starts and ends hidden and stays in bounds', () => {
  for (const t of [0, KILL.total]) {
    assert.equal(ringPose(t).alpha, 0);
    for (let i = 0; i < KILL.motes; i++) assert.equal(motePose(i, t).alpha, 0);
  }
  for (let t = 0; t <= KILL.total; t += .005) {
    for (let i = 0; i < KILL.motes; i++) {
      const p = motePose(i, t);
      assert.ok(p.y >= 0 && p.y <= .55 && Math.hypot(p.x, p.z) <= .45 && p.alpha >= 0 && p.alpha <= 1, `${i} ${t}`);
    }
    const r = ringPose(t); assert.ok(r.scale > 0 && r.scale <= .6 && r.alpha >= 0 && r.alpha <= .6);
  }
});

test('the ring stalls before it closes and one mote hangs longer', () => {
  const s = u => ringPose(u * KILL.total).scale;
  assert.ok(s(.6) - s(.74) < .01, 'stalled');
  assert.ok(s(.74) > s(.99));
  const life = i => { let n = 0; for (let t = 0; t < KILL.total; t += .005) if (motePose(i, t).alpha > 0) n += .005; return n; };
  assert.ok(life(0) > life(1) + .1);
});

test('only the first kill of a game is marked', () => {
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}}; this.rotation = {}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createFirstKill(THREE, {add() {}, remove() {}});
  fx.message('You kill the newt!', 1, 2);
  assert.equal(fx.active, 1);
  fx.update(KILL.total + .1);
  assert.equal(fx.active, 0);
  fx.message('You kill the rat!', 1, 2);
  assert.equal(fx.active, 0);
});
