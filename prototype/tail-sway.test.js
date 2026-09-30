import test from 'node:test';
import assert from 'node:assert/strict';
import {tailSway, FLAYER_SWING, FLAYER_SWING2} from './tail-sway.js';

const actor = (extra = {}) => ({g: {position: {x: 0, z: 0}}, ...extra});

test('other tails keep their old per-quirk sway', () => {
  const old = (q, t) => Math.sin(t * (q === 'dog' ? 7 : q === 'turtle' ? 1.1 : q === 'unicorn' ? 2.6 : q === 'nymph' ? 1.4 : 3)) * (q === 'dog' ? .34 : q === 'turtle' ? .06 : q === 'unicorn' ? .16 : q === 'nymph' ? .07 : .24);
  for (const quirk of ['dog', 'turtle', 'unicorn', 'nymph', 'idle', 'human', undefined])
    for (let t = 0; t < 10; t += .37) assert.equal(tailSway(actor({quirk, species: 'jackal'}), t), old(quirk, t));
});

test('mind flayer tentacles sway slower and smaller than the generic tail, within bounds', () => {
  for (const species of ['mind flayer', 'master mind flayer']) {
    const a = actor({quirk: 'idle', species}); let max = 0, maxStep = 0, prev = tailSway(a, 0);
    for (let t = 1 / 60; t < 60; t += 1 / 60) {
      const v = tailSway(a, t); assert.ok(Number.isFinite(v));
      max = Math.max(max, Math.abs(v)); maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v;
    }
    assert.ok(max <= FLAYER_SWING + FLAYER_SWING2 + 1e-9 && max > .1, `reach ${max}`);
    // generic tail: up to .24*3/60 = .012 rad a frame; the flayer's is well under half that
    assert.ok(maxStep < .005, `step ${maxStep}`);
  }
});

test('each flayer keeps its own phase, fixed from where it was first seen', () => {
  const a = actor({species: 'mind flayer', g: {position: {x: 3, z: 1}}}), b = actor({species: 'mind flayer', g: {position: {x: 4, z: 1}}});
  assert.notEqual(tailSway(a, 5), tailSway(b, 5));
  const before = tailSway(a, 7); a.g.position.x = 9; assert.equal(tailSway(a, 7), before);
});
