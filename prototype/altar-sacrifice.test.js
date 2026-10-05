import test from 'node:test';
import assert from 'node:assert/strict';
import {tonguePose, scorchPose, sacrificeKind, SACRIFICE} from './altar-sacrifice.js';

test('only the consumed messages trigger it', () => {
  assert.equal(sacrificeKind('Your sacrifice is consumed in a flash of light!'), 'light');
  assert.equal(sacrificeKind('Your sacrifice is consumed in a burst of flame!'), 'flame');
  for (const t of ['You offer the corpse.', 'You glimpse a four-leaf clover at your feet.', null]) assert.equal(sacrificeKind(t), null, String(t));
});

test('everything returns exactly to rest', () => {
  for (const k of Object.keys(SACRIFICE)) {
    assert.equal(tonguePose(k, 0).alpha, 0);
    assert.equal(tonguePose(k, SACRIFICE[k]).alpha, 0);
    assert.equal(scorchPose(k, 0).alpha, 0);
    assert.equal(scorchPose(k, SACRIFICE[k]).alpha, 0);
  }
});

test('poses stay in bounds, the tongue lunges then shuts, flame gutters', () => {
  for (const k of Object.keys(SACRIFICE)) {
    let peak = 0;
    for (let t = 0; t <= SACRIFICE[k]; t += .01) {
      const p = tonguePose(k, t), s = scorchPose(k, t);
      assert.ok(p.height >= 0 && p.height <= 1 && p.width >= 0 && p.width <= 1 && p.alpha >= 0 && p.alpha <= 1, `${k} ${t}`);
      assert.ok(s.alpha >= 0 && s.alpha <= .5 + 1e-9 && s.radius < .6);
      peak = Math.max(peak, p.height);
    }
    assert.ok(peak > .99 && tonguePose(k, SACRIFICE[k] * .9).height < .2, k);
  }
  let dips = 0, prev = 1;
  for (let t = .5; t < 1.4; t += .005) { const a = tonguePose('flame', t).alpha; if (a < .5 && prev >= .5) dips++; prev = a; }
  assert.ok(dips >= 2);
});
