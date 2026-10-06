import test from 'node:test';
import assert from 'node:assert/strict';
import {RING_DASHES, ringArcs} from './ring-shape.js';

test('a pet ring is one solid circle', () => {
  assert.deepEqual(ringArcs(RING_DASHES.pet), [[0, Math.PI * 2]]);
});

test('a peaceful ring is broken into separate dashes with gaps', () => {
  const arcs = ringArcs(RING_DASHES.peaceful);
  assert.equal(arcs.length, 8);
  for (let i = 0; i < arcs.length; i++) {
    const [a, b] = arcs[i];
    assert.ok(b > a);
    const next = arcs[(i + 1) % arcs.length][0] + (i === arcs.length - 1 ? Math.PI * 2 : 0);
    assert.ok(next > b, 'gap between dashes');
  }
});

test('pet and peaceful shapes differ', () => {
  assert.notEqual(RING_DASHES.pet, RING_DASHES.peaceful);
});
