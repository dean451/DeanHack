import test from 'node:test';
import assert from 'node:assert/strict';
import {lidPose, pupilPose, isThroneInsightMessage, createThroneInsight, INSIGHT} from './throne-insight.js';

test('only the throne\'s insight triggers it', () => {
  assert.ok(isThroneInsightMessage('You are granted an insight!'));
  for (const t of ['You sit on the throne.', 'A curse upon thee for sitting upon this most holy throne!', null]) assert.ok(!isThroneInsightMessage(t), String(t));
});

test('everything starts and ends invisible and shut', () => {
  for (const t of [0, INSIGHT.total]) { assert.equal(lidPose(t).alpha, 0); assert.equal(lidPose(t).open, 0); assert.equal(pupilPose(t).alpha, 0); }
});

test('the eye opens, blinks twice, then shuts, in bounds', () => {
  assert.ok(lidPose(.5).open > .9);
  assert.ok(lidPose(.75).open < .2 && lidPose(.6).open > lidPose(.75).open);
  assert.ok(lidPose(1.05).open < .4 && lidPose(.95).open > lidPose(1.05).open);
  assert.ok(lidPose(1.4).open < lidPose(.9).open);
  for (let t = 0; t <= INSIGHT.total; t += .004) { const p = lidPose(t); assert.ok(p.open >= 0 && p.open <= 1 + 1e-9 && p.alpha >= 0 && p.alpha <= .75 + 1e-9 && p.y >= 1.4 && p.y <= 1.6, String(t)); }
});

test('the pupil flicks aside and snaps back, in bounds', () => {
  assert.equal(pupilPose(.4).x, 0);
  assert.ok(pupilPose(.61).x > .08);
  assert.equal(pupilPose(.9).x, 0);
  for (let t = 0; t <= INSIGHT.total; t += .004) { const p = pupilPose(t); assert.ok(Math.abs(p.x) <= .13 && p.alpha >= 0 && p.alpha <= .95 + 1e-9, String(t)); }
});

test('it plays on the hero\'s square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createThroneInsight(THREE, {add() {}, remove() {}});
  fx.message('You are granted an insight!', 3, 4);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [3, 4]);
  fx.update(INSIGHT.total + .1); assert.equal(fx.active, 0);
  fx.message('You are granted an insight!', 0, 0); fx.clear(); assert.equal(fx.active, 0);
});
