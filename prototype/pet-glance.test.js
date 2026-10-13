import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import * as M from './pet-glance.js';

const dt = 1 / 60;
const dog = () => createCreature({name: 'little dog', symbol: 'd'.charCodeAt(0), color: 1, kind: 'pet'});

test('only pets glance', () => {
  const j = createCreature({name: 'jackal', symbol: 'd'.charCodeAt(0), color: 1});
  assert.equal(M.updatePetGlance(j, dt, 0, true, true, {x: 1, z: 0}), null);
});

test('the curve snaps in, holds and returns exactly to zero', () => {
  assert.equal(M.glanceCurve(0), 0);
  assert.equal(M.glanceCurve(M.glanceLen()), 0);
  assert.ok(M.glanceCurve(M.SNAP_IN) === 1 && M.glanceCurve(M.SNAP_IN + M.HOLD * .9) === 1);
});

test('a walking pet glances back, stays in bounds and rests exactly', () => {
  const a = dog(), y0 = a.head.rotation.y, look = {x: 2, y: 0, z: 1};
  a.g.position.set(0, 0, 0); a.g.rotation.y = 0;
  let peak = 0;
  for (let i = 0; i < 60 * 12; i++) {
    M.updatePetGlance(a, dt, i * dt, true, true, look);
    const d = Math.abs(a.head.rotation.y - y0);
    peak = Math.max(peak, d);
    assert.ok(d <= M.MAX_YAW + 1e-9);
  }
  assert.ok(peak > .3, 'it looked');
  for (let i = 0; i < 120; i++) M.updatePetGlance(a, dt, i * dt, false, false, look);
  assert.ok(Math.abs(a.head.rotation.y - y0) < 1e-6, 'standing lets it go');
});

test('no hero or a hero out of range gives no glance', () => {
  const a = dog(), y0 = a.head.rotation.y;
  for (let i = 0; i < 60 * 10; i++) M.updatePetGlance(a, dt, i * dt, true, true, null);
  assert.equal(a.head.rotation.y, y0);
});

test('the stare dips once mid-hold and recovers', () => {
  const mid = M.glanceCurve(M.SNAP_IN + M.HOLD * .55);
  assert.ok(mid < 1 && mid > .8);
  assert.equal(M.glanceCurve(M.SNAP_IN + M.HOLD * .2), 1);
});
