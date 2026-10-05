import test from 'node:test';
import assert from 'node:assert/strict';
import {gasExposure, coughState, gasTint, createGasEdge, GAS_INNER, GAS_OUTER, GAS_TINT, COUGH_EVERY, COUGH_LEN} from './gas-edge.js';

const cloud = {x: 3, z: 4};

test('exposure is full at the heart of a cloud and fades to nothing outside', () => {
  assert.equal(gasExposure({x: 3, z: 4}, [cloud]), 1);
  assert.ok(gasExposure({x: 3 + GAS_INNER, z: 4}, [cloud]) > .999);
  assert.ok(gasExposure({x: 3 + GAS_OUTER, z: 4}, [cloud]) < 1e-9);
  const mid = gasExposure({x: 3 + (GAS_INNER + GAS_OUTER) / 2, z: 4}, [cloud]);
  assert.ok(mid > .4 && mid < .6);
  assert.equal(gasExposure(null, [cloud]), 0);
  assert.equal(gasExposure({x: 3, z: 4}, []), 0);
});

test('the nearest cloud wins', () => {
  assert.equal(gasExposure({x: 3, z: 4}, [{x: 9, z: 9}, cloud]), 1);
});

test('coughs come in bursts, then rest exactly', () => {
  assert.deepEqual(coughState(1, 1), {flare: 0, jolt: 0});
  assert.deepEqual(coughState(COUGH_EVERY * 3 + COUGH_LEN + .01, 1), {flare: 0, jolt: 0});
  assert.deepEqual(coughState(COUGH_EVERY, 1), {flare: 0, jolt: 0});
  let peak = 0;
  for (let t = 0; t < COUGH_LEN; t += .01) { const c = coughState(t, 1); assert.ok(c.flare >= 0 && c.flare <= .31); peak = Math.max(peak, c.flare); }
  assert.ok(peak > .1);
  assert.deepEqual(coughState(.2, .3), {flare: 0, jolt: 0}); // thin edge of the cloud: no cough
});

test('the tint is faint, clear outside the gas and capped', () => {
  assert.equal(gasTint(0), 0);
  assert.equal(gasTint(1), GAS_TINT);
  assert.ok(gasTint(1, 5) <= 1);
});

test('the overlay eases in, eases out and is never made outside gas', () => {
  const made = [];
  const style = {};
  const doc = {body: {appendChild: e => made.push(e)}, createElement: () => ({style: {}, set id(v) {}}), getElementById: () => ({style})};
  const edge = createGasEdge(doc);
  const mesh = {visible: true, parent: {getWorldPosition: v => v.set(0, 0, 0)}};
  edge.update(0, .1, {x: 9, z: 9}, [mesh]);
  assert.equal(made.length, 0);
  assert.equal(edge.level, 0);
  edge.update(.1, .1, {x: 0, z: 0}, [mesh]);
  assert.ok(edge.level > 0 && edge.level < 1);
  assert.equal(made.length, 1);
  for (let t = .2; t < 6; t += .1) edge.update(t, .1, {x: 0, z: 0}, [mesh]);
  assert.ok(edge.level > .95);
  for (let t = 6; t < 12; t += .1) edge.update(t, .1, {x: 9, z: 9}, [mesh]);
  assert.equal(edge.level, 0);
  assert.equal(made[0].style.opacity, '0');
  assert.equal(style.transform, '');
});

test('the hero folds forward with each heave and stands upright between coughs', async () => {
  const {coughHunch, COUGH_HUNCH} = await import('./gas-edge.js');
  assert.equal(coughHunch({flare: 0, jolt: 0}), 0);
  let peak = 0;
  for (let t = 0; t < COUGH_LEN; t += .01) { const h = coughHunch(coughState(t, 1)); assert.ok(h >= 0 && h <= COUGH_HUNCH); peak = Math.max(peak, h); }
  assert.ok(peak > COUGH_HUNCH * .4);
  const edge = createGasEdge({body: {appendChild() {}}, createElement: () => ({style: {}}), getElementById: () => null});
  const mesh = {visible: true, parent: {getWorldPosition: v => v.set(0, 0, 0)}};
  for (let t = 0; t < 12; t += .05) edge.update(t, .05, {x: 0, z: 0}, [mesh]);
  for (let t = 12; t < 20; t += .1) edge.update(t, .1, {x: 9, z: 9}, [mesh]);
  assert.equal(edge.hunch, 0);
});
