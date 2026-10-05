import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, puffPose, isNymphMessage, NYMPH} from './fountain-nymph.js';

test('only the nymph message triggers it', () => {
  assert.ok(isNymphMessage('You attract a water nymph!'));
  for (const t of ['You unleash a water demon!', 'A wisp of vapor escapes the fountain.', null]) assert.ok(!isNymphMessage(t), String(t));
});

test('rings and mist start and end invisible', () => {
  for (let i = 0; i < NYMPH.rings; i++) { assert.equal(ringPose(i, 0).alpha, 0); assert.equal(ringPose(i, NYMPH.total).alpha, 0); }
  for (let i = 0; i < NYMPH.puffs; i++) { assert.equal(puffPose(i, 0).alpha, 0); assert.equal(puffPose(i, NYMPH.total).alpha, 0); }
});

test('rings widen one after another, in bounds, never shrinking', () => {
  for (let i = 0; i < NYMPH.rings; i++) {
    let prev = 0;
    for (let t = 0; t <= NYMPH.total; t += .01) { const p = ringPose(i, t); assert.ok(p.radius >= prev - 1e-9 && p.radius <= .8 && p.alpha >= 0 && p.alpha <= .6, `${i} ${t}`); prev = p.radius; }
  }
  assert.ok(ringPose(0, 1).alpha > ringPose(2, 1).alpha);
});

test('mist climbs and leans toward the hero without popping', () => {
  for (let i = 0; i < NYMPH.puffs; i++) {
    let prevY = 0, seen = false;
    for (let t = 0; t <= NYMPH.total; t += .01) {
      const p = puffPose(i, t); assert.ok(p.y >= prevY - 1e-9 && p.y < 1.1 && p.lean >= 0 && p.alpha <= .45 + 1e-9, `${i} ${t}`);
      if (p.alpha > .1) seen = true; prevY = p.y;
    }
    assert.ok(seen, `puff ${i} never showed`);
  }
});
