import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pickupLiftAt, updatePickupLift, hasMagicLook, PICKUP_DURATION, PICKUP_RISE} from './pickup-lift.js';

test('the lift starts at rest, stays in bounds and ends fully shrunk', () => {
  const start = pickupLiftAt(0);
  assert.equal(start.y, 0);
  assert.equal(start.scale, 1);
  const end = pickupLiftAt(PICKUP_DURATION);
  assert.ok(Math.abs(end.y - PICKUP_RISE) < 1e-9);
  assert.equal(end.scale, 0);
  for (let t = 0; t <= PICKUP_DURATION; t += .005) {
    const p = pickupLiftAt(t);
    assert.ok(p.y >= -.05 && p.y <= PICKUP_RISE + 1e-9 && p.scale >= 0 && p.scale <= 1);
  }
  assert.equal(pickupLiftAt(5).scale, 0);
});

test('a hitch of anticipation dips below the floor before the rise', () => {
  assert.ok(pickupLiftAt(PICKUP_DURATION * .1).y < 0);
});

test('a lifting item drifts toward the hero and finishes at the duration', () => {
  const item = new THREE.Group();
  item.position.set(4, 0, 4);
  const hero = {x: 5, z: 4};
  assert.equal(updatePickupLift(item, hero, .1), false);
  assert.ok(item.position.x > 4 && item.position.x < 5);
  assert.equal(updatePickupLift(item, hero, PICKUP_DURATION), true);
  assert.ok(item.position.x <= 4.5 + 1e-9 && item.position.y > 0);
  assert.ok(item.scale.x > 0, 'never a degenerate zero scale');
});

test('only items with a magic look lift', () => {
  const plain = new THREE.Group(), magic = new THREE.Group();
  magic.userData.ringAura = new THREE.Group();
  assert.equal(hasMagicLook(plain), false);
  assert.equal(hasMagicLook(magic), true);
});
