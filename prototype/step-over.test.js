import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stepPulseAt, scoopSwell, STEP_DURATION, STEP_SWELL} from './step-over.js';
import {createWandAura} from './wand-auras.js';
import {createScrollAura} from './scroll-auras.js';
import {updatePickupLift} from './pickup-lift.js';

const floorItem = kind => {
  const item = new THREE.Group();
  item.userData.wandAura = createWandAura(kind, 'k');
  item.add(item.userData.wandAura);
  return item;
};

test('the pulse is zero at both ends, peaks early and stays in bounds', () => {
  assert.equal(stepPulseAt(0), 0);
  assert.equal(stepPulseAt(STEP_DURATION), 0);
  assert.equal(stepPulseAt(-1), 0);
  assert.equal(stepPulseAt(NaN), 0);
  let peak = 0, peakAt = 0;
  for (let t = 0; t < STEP_DURATION; t += .005) {
    const p = stepPulseAt(t);
    assert.ok(p >= 0 && p <= 1);
    if (p > peak) { peak = p; peakAt = t; }
  }
  assert.ok(peak > .99 && peakAt < STEP_DURATION / 2, 'a quick heave, then a slow ease back');
});

test('the pickup scoop swells a wand aura once, then it returns exactly to rest', () => {
  const item = floorItem('death');
  let biggest = 1;
  for (let u = 0; u <= 1; u += 1 / 60) { scoopSwell(item, u); biggest = Math.max(biggest, item.userData.wandAura.scale.x); }
  scoopSwell(item, 1);
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(item.userData.wandAura.scale.x, 1);
});

test('only wand auras answer; a lamp hum or a bare item is left alone', () => {
  const lamp = floorItem('magic lamp');
  scoopSwell(lamp, .3);
  assert.equal(lamp.userData.wandAura.scale.x, 1);
  const bare = new THREE.Group();
  assert.doesNotThrow(() => scoopSwell(bare, .3));
});

test('a scroll aura swells on arrival and returns exactly to rest', () => {
  const item = new THREE.Group();
  item.userData.scrollAura = createScrollAura('fire', 'k', null);
  item.add(item.userData.scrollAura);
  const aura = item.userData.scrollAura;
  assert.ok(aura, 'the fire scroll has an aura');
  let biggest = 1;
  for (let u = 0; u <= 1; u += 1 / 60) { scoopSwell(item, u); biggest = Math.max(biggest, aura.scale.x); }
  scoopSwell(item, 1);
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(aura.scale.x, 1);
});

test('a potion effect swells on arrival and returns exactly to rest', () => {
  const item = new THREE.Group();
  const fx = new THREE.Group();
  item.userData.potionFx = fx;
  item.add(fx);
  let biggest = 1;
  for (let u = 0; u <= 1; u += 1 / 60) { scoopSwell(item, u); biggest = Math.max(biggest, fx.scale.x); }
  scoopSwell(item, 1);
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(fx.scale.x, 1);
});

test('an artifact gleam swells on arrival, flinging its motes out, and returns exactly to rest', () => {
  const item = new THREE.Group();
  const gleam = new THREE.Group();
  item.userData.artifactGleam = gleam;
  item.add(gleam);
  let biggest = 1;
  for (let u = 0; u <= 1; u += 1 / 60) { scoopSwell(item, u); biggest = Math.max(biggest, gleam.scale.x); }
  scoopSwell(item, 1);
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(gleam.scale.x, 1);
});

test('a ring aura swells on arrival and returns exactly to rest', () => {
  const item = new THREE.Group();
  const aura = new THREE.Group();
  item.userData.ringAura = aura;
  item.add(aura);
  let biggest = 1;
  for (let u = 0; u <= 1; u += 1 / 60) { scoopSwell(item, u); biggest = Math.max(biggest, aura.scale.x); }
  scoopSwell(item, 1);
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(aura.scale.x, 1);
});

test('a lifting item swells its aura, and nothing swells before the lift starts', () => {
  const item = floorItem('death');
  item.position.set(2, 0, 2);
  assert.equal(item.userData.wandAura.scale.x, 1);
  let biggest = 1, done = false;
  for (let i = 0; i < 60 && !done; i++) { done = updatePickupLift(item, {x: 0, z: 0}, 1 / 60); biggest = Math.max(biggest, item.userData.wandAura.scale.x); }
  assert.ok(done && biggest > 1.5);
});
