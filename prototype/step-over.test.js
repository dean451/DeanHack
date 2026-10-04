import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stepPulseAt, updateStepOver, STEP_DURATION, STEP_SWELL} from './step-over.js';
import {createWandAura} from './wand-auras.js';
import {createScrollAura} from './scroll-auras.js';

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

test('arriving on a wand swells its aura once, then it returns exactly to rest', () => {
  const item = floorItem('death');
  let biggest = 1;
  updateStepOver(item, true, 0);
  for (let t = 0; t < 1; t += 1 / 60) { updateStepOver(item, true, 1 / 60); biggest = Math.max(biggest, item.userData.wandAura.scale.x); }
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(item.userData.wandAura.scale.x, 1);
  // Still standing there: no second pulse.
  updateStepOver(item, true, .1);
  assert.equal(item.userData.wandAura.scale.x, 1);
  // Step off and back on: it answers again.
  updateStepOver(item, false, 1 / 60);
  updateStepOver(item, true, 1 / 60);
  updateStepOver(item, true, .1);
  assert.ok(item.userData.wandAura.scale.x > 1);
});

test('only wand auras answer; a lamp hum or a bare item is left alone', () => {
  const lamp = floorItem('magic lamp');
  updateStepOver(lamp, true, .1);
  updateStepOver(lamp, true, .1);
  assert.equal(lamp.userData.wandAura.scale.x, 1);
  const bare = new THREE.Group();
  assert.doesNotThrow(() => updateStepOver(bare, true, .1));
});

test('a scroll aura swells on arrival and returns exactly to rest', () => {
  const item = new THREE.Group();
  item.userData.scrollAura = createScrollAura('fire', 'k', null);
  item.add(item.userData.scrollAura);
  const aura = item.userData.scrollAura;
  assert.ok(aura, 'the fire scroll has an aura');
  let biggest = 1;
  updateStepOver(item, true, 0);
  for (let t = 0; t < 1; t += 1 / 60) { updateStepOver(item, true, 1 / 60); biggest = Math.max(biggest, aura.scale.x); }
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(aura.scale.x, 1);
});

test('a potion effect swells on arrival and returns exactly to rest', () => {
  const item = new THREE.Group();
  const fx = new THREE.Group();
  item.userData.potionFx = fx;
  item.add(fx);
  let biggest = 1;
  updateStepOver(item, true, 0);
  for (let t = 0; t < 1; t += 1 / 60) { updateStepOver(item, true, 1 / 60); biggest = Math.max(biggest, fx.scale.x); }
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(fx.scale.x, 1);
});

test('an artifact gleam swells on arrival, flinging its motes out, and returns exactly to rest', () => {
  const item = new THREE.Group();
  const gleam = new THREE.Group();
  item.userData.artifactGleam = gleam;
  item.add(gleam);
  let biggest = 1;
  updateStepOver(item, true, 0);
  for (let t = 0; t < 1; t += 1 / 60) { updateStepOver(item, true, 1 / 60); biggest = Math.max(biggest, gleam.scale.x); }
  assert.ok(biggest > 1.5 && biggest <= 1 + STEP_SWELL + 1e-9);
  assert.equal(gleam.scale.x, 1);
});
