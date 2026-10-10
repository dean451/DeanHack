import test from 'node:test';
import assert from 'node:assert/strict';
import {tailSway, dogFreeze, unicornLash, UNI_PERIOD, UNI_LEN, UNI_FLICK, DOG_PERIOD, DOG_HOLD, DOG_STILL, FLAYER_SWING, FLAYER_SWING2} from './tail-sway.js';

const actor = (extra = {}) => ({g: {position: {x: 0, z: 0}}, ...extra});

test('other tails keep their old per-quirk sway', () => {
  const old = (q, t) => Math.sin(t * (q === 'dog' ? 7 : q === 'turtle' ? 1.1 : q === 'unicorn' ? 2.6 : q === 'nymph' ? 1.4 : 3)) * (q === 'dog' ? .34 : q === 'turtle' ? .06 : q === 'unicorn' ? .16 : q === 'nymph' ? .07 : .24);
  for (const quirk of ['turtle', 'nymph', 'idle', 'human', undefined])
    for (let t = 0; t < 10; t += .37) assert.equal(tailSway(actor({quirk, species: 'jackal'}), t), old(quirk, t));
});

test('a dog\'s wag cuts out and holds the tail stiff now and then, then resumes, within its old reach', () => {
  const a = actor({quirk: 'dog', species: 'jackal'});
  let frozen = 0, maxAbs = 0, maxStep = 0, prev = tailSway(a, 0);
  for (let t = 1 / 60; t < DOG_PERIOD * 4; t += 1 / 60) {
    const v = tailSway(a, t), g = dogFreeze(t, 0);
    assert.ok(Number.isFinite(v) && g >= DOG_STILL - 1e-9 && g <= 1 + 1e-9);
    if (g < .2) frozen += 1 / 60;
    maxAbs = Math.max(maxAbs, Math.abs(v)); maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v;
  }
  assert.ok(maxAbs <= .34 + 1e-9 && maxAbs > .3, `reach ${maxAbs}`);
  assert.ok(maxStep < .07, `step ${maxStep}`);
  assert.ok(Math.abs(frozen - 4 * (DOG_HOLD - .1)) < .6, `frozen ${frozen}`);
  // outside the freeze it is the plain wag, exactly
  for (const t of [3, 4.1, 5.5, 6.9]) assert.equal(tailSway(a, t), Math.sin(t * 7) * .34);
  // each dog freezes at its own time, and gallery phase still shifts the wag
  assert.ok(dogFreeze(.5, 0) < .2 && dogFreeze(.5, 2.5) === 1);
  const b = actor({quirk: 'dog', species: 'jackal'});
  assert.equal(tailSway(b, 4, 1.2), Math.sin(4 * 7 + 1.2) * .34);
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

test('a phase shifts the quirk sway exactly as the gallery used to, and leaves flayers alone', () => {
  const old = (q, t, ph) => Math.sin(t * (q === 'dog' ? 7 : q === 'turtle' ? 1.1 : q === 'unicorn' ? 2.6 : q === 'nymph' ? 1.4 : 3) + ph) * (q === 'dog' ? .34 : q === 'turtle' ? .06 : q === 'unicorn' ? .16 : q === 'nymph' ? .07 : .24);
  for (const quirk of ['turtle', 'nymph', 'idle'])
    for (let t = 0; t < 10; t += .37) assert.equal(tailSway(actor({quirk, species: 'fox'}), t, 2.19), old(quirk, t, 2.19));
  const f = actor({species: 'mind flayer'});
  assert.equal(tailSway(f, 4, 1.5), tailSway(f, 4));
});

test('a unicorn\'s tail lashes twice now and then, smoothly, and is the plain swish between lashes', () => {
  const a = actor({quirk: 'unicorn', species: 'white unicorn'});
  let max = 0, lashed = 0, maxStep = 0, prev = tailSway(a, 0);
  for (let t = 1 / 60; t < UNI_PERIOD * 4; t += 1 / 60) {
    const v = tailSway(a, t), l = unicornLash(t, 0);
    assert.ok(Number.isFinite(v) && Math.abs(l) <= UNI_FLICK + 1e-9);
    if (l !== 0) lashed += 1 / 60;
    else assert.equal(v, Math.sin(t * 2.6) * .16);
    max = Math.max(max, Math.abs(v)); maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v;
  }
  assert.ok(Math.abs(lashed - 4 * UNI_LEN) < .5, `lashed ${lashed}`);
  assert.ok(max > .16 && max <= .16 + UNI_FLICK + 1e-9, `reach ${max}`);
  assert.ok(maxStep < .08, `step ${maxStep}`);
  assert.equal(unicornLash(0, 0), 0);
  assert.ok(Math.abs(unicornLash(UNI_LEN - 1e-9, 0)) < 1e-6);
});
