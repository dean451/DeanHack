import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateGait, analyseGait, measurePose, REFERENCE, LEGS} from './cat-measure.js';

// The measuring itself (not yet the cat against the reference: tools/cat-lab.html shows that).
test('a steady walk is measured into strides, footfalls and joint curves', () => {
  const rec = simulateGait({bl: 1.35, seconds: 3, hull: false}), an = analyseGait(rec);
  assert.ok(rec.bodyLength > .3 && rec.bodyLength < .8, `kitten body length ${rec.bodyLength}`);
  assert.ok(an.strides >= 3, `strides ${an.strides}`);
  assert.ok(an.strideHz > 0 && Number.isFinite(an.strideHz));
  for (const d of an.duty) assert.ok(d > 0 && d < 1, `duty ${d}`);
  assert.equal(an.order.length, 4);
  for (const j of ['hip', 'knee', 'ankle']) assert.ok(an.curve[j].every(v => v > 0 && v < 180), j);
  assert.equal(an.contact.length, LEGS.length);
});

test('the sit is measured by its hip height and what touches the floor', () => {
  const p = measurePose({clip: 'sit', hull: false}), stand = measurePose({clip: 'idle', u: 0, hull: false});
  assert.ok(p.hipRatio > 0 && p.hipRatio < 1, `hip ratio ${p.hipRatio}`);
  assert.ok(Math.abs(stand.hipRatio - 1) < 1e-6);
  assert.equal(p.pawsCm.length, 4);
  assert.ok(Number.isFinite(p.lowestBodyCm));
  assert.ok(REFERENCE.walk.duty[0] < REFERENCE.walk.duty[1]);
});
