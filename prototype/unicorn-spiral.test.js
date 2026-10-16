import test from 'node:test';
import assert from 'node:assert/strict';
import {pearlPose, wispPose, isSpiralMessage, createUnicornSpiral, SPIRAL} from './unicorn-spiral.js';

test('only the attribute-restored messages trigger it', () => {
  assert.ok(isSpiralMessage('This makes you feel better!'));
  assert.ok(isSpiralMessage('This makes you feel great!'));
  for (const t of ['Nothing seems to happen.', 'You feel better.', null]) assert.ok(!isSpiralMessage(t), String(t));
});

test('every mote starts and ends hidden and stays in bounds', () => {
  const poses = [...Array(SPIRAL.pearls).keys()].map(i => t => pearlPose(i, t)).concat([...Array(SPIRAL.wisps).keys()].map(i => t => wispPose(i, t)));
  poses.forEach((f, k) => {
    for (const t of [0, SPIRAL.total]) assert.equal(f(t).alpha, 0, `${k} ${t}`);
    for (let t = 0; t <= SPIRAL.total; t += .005) { const p = f(t); assert.ok(p.y >= 0 && p.y <= 2 && Math.hypot(p.x, p.z) <= .85 && p.scale > 0 && p.scale <= .1 && p.alpha >= 0 && p.alpha <= .8, `${k} ${t}`); }
  });
});

test('pearls climb; the last one stalls at the knee and then catches up', () => {
  const last = SPIRAL.pearls - 1;
  for (let t = .1; t < .4; t += .02) assert.ok(pearlPose(0, t + .02).y > pearlPose(0, t).y);
  const stall = pearlPose(last, .8).y - pearlPose(last, .6).y, run = pearlPose(0, .8).y - pearlPose(0, .6).y;
  assert.ok(stall < run / 2, 'the lagging pearl hesitates');
  assert.ok(pearlPose(last, 1.2).y > pearlPose(last, 1.1).y);
  assert.ok(pearlPose(last, 1.2).y - pearlPose(last, .9).y > .2, 'then it hurries');
});

test('wisps rise and spread as they fade', () => {
  assert.ok(wispPose(0, 1.1).y > wispPose(0, .7).y);
  assert.ok(Math.hypot(wispPose(0, 1.1).x, wispPose(0, 1.1).z) > Math.hypot(wispPose(0, .7).x, wispPose(0, .7).z));
});

test('a cure starts an effect that is cleaned up', () => {
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createUnicornSpiral(THREE, {add() {}, remove() {}});
  fx.message('This makes you feel better!', 1, 2);
  assert.equal(fx.active, 1);
  fx.update(SPIRAL.total + .1);
  assert.equal(fx.active, 0);
});
