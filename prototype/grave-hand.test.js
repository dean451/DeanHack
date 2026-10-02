import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGrave} from './grave.js';
import {createGraveHands, handPose, slotMove, reachPose, heroPull, heroFromHand, MOVES, HAND_SLOT, HAND_TILT, CLAW_RANGE, AWARE, REACH} from './grave-hand.js';

test('every hand move starts and ends at rest and stays in range', () => {
  for (const [kind, keys] of Object.entries(MOVES)) {
    assert.deepEqual(keys[0].slice(1), [0, 0, 0], kind);
    assert.deepEqual(keys[keys.length - 1].slice(1), [0, 0, 0], kind);
    assert.ok(keys[keys.length - 1][0] < HAND_SLOT, kind);
    for (const [, c, x, z] of keys) {
      assert.ok(c >= CLAW_RANGE[0] && c <= CLAW_RANGE[1], kind);
      assert.ok(Math.hypot(x, z) <= HAND_TILT + 1e-9, kind);
    }
  }
});

test('the grave hand is still between moves, finite and bounded, with a mix of moves', () => {
  for (const phase of [0, .37, .91]) {
    let rest = 0, n = 0;
    const kinds = new Set();
    for (let t = 0; t < 400; t += 1 / 30) {
      const p = handPose(t, phase);
      for (const v of [p.claw, p.x, p.z]) assert.ok(Number.isFinite(v));
      assert.ok(p.claw >= CLAW_RANGE[0] - 1e-9 && p.claw <= CLAW_RANGE[1] + 1e-9);
      assert.ok(Math.hypot(p.x, p.z) <= HAND_TILT + 1e-9);
      if (p.kind) kinds.add(p.kind);else { rest++;assert.deepEqual([p.claw, p.x, p.z], [0, 0, 0]); }
      n++;
    }
    assert.ok(rest / n > .5, 'mostly still');
    assert.ok(kinds.size >= 3, 'several kinds of move');
  }
  for (let s = 0; s < 200; s++) {
    const m = slotMove(s, .5);
    if (m) assert.ok(m.start >= s * HAND_SLOT && m.start + m.keys[m.keys.length - 1][0] <= (s + 1) * HAND_SLOT + 1e-9);
  }
});

test('createGraveHands poses risen graves from their rest and leaves quiet ones alone', () => {
  const scene = new THREE.Scene();
  let risen = null, quiet = null;
  for (let seed = 0; seed < 40 && !(risen && quiet); seed++) {
    const g = createGrave(seed);
    if (g.userData.risen) risen ??= g;else quiet ??= g;
  }
  scene.add(risen, quiet);
  const hands = createGraveHands(scene);
  hands.update(0);
  assert.deepEqual(hands.graves, [risen]);
  const {hand, claw} = risen.userData;
  let moved = false;
  for (let t = 0; t < 60; t += 1 / 30) {
    hands.update(t);
    const p = handPose(t, risen.userData.handPhase);
    if (p.kind) moved = true;
    else {
      assert.ok(hand.quaternion.angleTo(hand.userData.rest.quaternion) < 1e-6);
      assert.ok(claw.quaternion.angleTo(claw.userData.rest.quaternion) < 1e-6);
    }
    assert.ok(hand.quaternion.angleTo(hand.userData.rest.quaternion) <= HAND_TILT + 1e-6);
    assert.ok(hand.position.equals(hand.userData.rest.position));
  }
  assert.ok(moved);
  for (const g of [risen, quiet]) g.userData.dispose();
});

test('the hand reaches toward a nearby hero, within bounds, and settles back when they leave', () => {
  assert.equal(heroPull(AWARE + .1), 0);
  assert.equal(heroPull(REACH - .1), 1);
  assert.equal(heroPull(NaN), 0);
  for (let t = 0; t < 20; t += 1 / 30) for (const a of [0, .3, 1]) {
    const p = reachPose(t, a, .6, .8, .4);
    for (const x of [p.claw, p.x, p.z]) assert.ok(Number.isFinite(x));
    assert.ok(p.claw >= CLAW_RANGE[0] && p.claw <= CLAW_RANGE[1]);
    assert.ok(Math.hypot(p.x, p.z) <= HAND_TILT + 1e-9);
    // the lean points at the hero: +x tilts toward +z, +z leans toward -x
    if (a > 0) assert.ok(p.x > 0 && p.z < 0);
  }
  let risen = null;
  for (let seed = 0; !risen; seed++) { const g = createGrave(seed); if (g.userData.risen) risen = g; }
  const scene = new THREE.Scene();
  risen.position.set(4, 0, 2);
  scene.add(risen);
  const hands = createGraveHands(scene);
  const {hand, claw} = risen.userData;
  // the hero one tile east: the hand leans toward +x in grave space, and clutches
  const hero = new THREE.Vector3(5, 0, 2);
  const h = heroFromHand(risen, hero);
  assert.ok(Math.abs(h.dist - 1) < .1);
  let clutchOpen = Infinity, clutchShut = -Infinity, toward = 0, n = 0;
  const tip = new THREE.Vector3(), rest = new THREE.Vector3();
  for (let t = 0; t < 12; t += 1 / 30) {
    hands.update(t, hero);
    if (t > 2) {
      const c = new THREE.Euler().setFromQuaternion(claw.userData.rest.quaternion.clone().invert().multiply(claw.quaternion)).x;
      clutchOpen = Math.min(clutchOpen, c);clutchShut = Math.max(clutchShut, c);
      // the knuckles move east of where they rest
      risen.updateMatrixWorld(true);
      claw.getWorldPosition(tip);
      toward += tip.x;n++;
      assert.ok(Math.abs(tip.x - risen.position.x) < .43 && Math.abs(tip.z - risen.position.z) < .43);
    }
  }
  assert.ok(risen.userData.handAlert > .95);
  assert.ok(clutchOpen < -.4 && clutchShut > .1, `clutches: ${clutchOpen}..${clutchShut}`);
  hand.quaternion.copy(hand.userData.rest.quaternion);claw.quaternion.copy(claw.userData.rest.quaternion);
  risen.updateMatrixWorld(true);claw.getWorldPosition(rest);
  assert.ok(toward / n > rest.x + .005, 'leans toward the hero');
  // the hero walks away: the alertness fades and the hand is back to its idle
  for (let t = 12; t < 30; t += 1 / 30) hands.update(t, null);
  assert.equal(risen.userData.handAlert, 0);
  const p = handPose(29.9, risen.userData.handPhase);
  if (!p.kind) assert.ok(hand.quaternion.angleTo(hand.userData.rest.quaternion) < 1e-6);
});
