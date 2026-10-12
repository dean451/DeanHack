import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMarks, marksFor, hash, MARK_MAX, KINDS, FADE_S} from './marks.js';

test('a hit makes one splat and a kill a pool with bones; a pet leaves no bones', () => {
  assert.deepEqual(marksFor({type: 'combat', x: 3, z: 4}).map(m => m.kind), ['splat']);
  const k = marksFor({type: 'death', x: 3, z: 4}).map(m => m.kind);
  assert.equal(k[0], 'pool'); assert.ok(k.filter(x => x === 'bone').length >= 2);
  assert.deepEqual(marksFor({type: 'death', x: 3, z: 4, pet: true}).map(m => m.kind), ['pool']);
  assert.deepEqual(marksFor({type: 'death', x: NaN, z: 1}), []);
  assert.deepEqual(marksFor(null), []);
});

test('marks stay within a cell of the event and are deterministic', () => {
  const a = marksFor({type: 'death', x: 5, z: 7}), b = marksFor({type: 'death', x: 5, z: 7});
  assert.deepEqual(a, b);
  for (const m of a) { assert.ok(Math.abs(m.x - 5) < .5 && Math.abs(m.z - 7) < .5); assert.ok(m.s >= .75 && m.s <= 1.35); }
  assert.ok(hash(1, 2) >= 0 && hash(1, 2) < 1);
});

test('the pool is capped and the oldest marks fade out first', () => {
  const parent = new THREE.Group(), marks = createMarks(THREE, parent);
  for (let i = 0; i < MARK_MAX + 10; i++) marks.add({type: 'combat', x: i, z: 0});
  assert.equal(marks.solid(), MARK_MAX);
  const first = parent.children[0];
  marks.update(FADE_S / 2);
  assert.ok(first.material.opacity < KINDS.splat.opacity && first.material.opacity > 0);
  assert.ok(parent.children[MARK_MAX + 5].material.opacity === KINDS.splat.opacity);
  marks.update(FADE_S);
  assert.equal(marks.count(), MARK_MAX);
  assert.equal(parent.children.length, MARK_MAX);
  assert.ok(!parent.children.includes(first));
});

test('marks are flat, low, shared in geometry, and clear() removes everything', () => {
  const parent = new THREE.Group(), marks = createMarks(THREE, parent);
  for (let i = 0; i < 12; i++) marks.add({type: 'death', x: i, z: i});
  assert.ok(new Set(parent.children.map(m => m.geometry)).size <= 4);
  for (const m of parent.children) { assert.ok(m.position.y > 0 && m.position.y < .05); assert.equal(m.material.depthWrite, false); }
  marks.update(NaN);
  marks.clear();
  assert.equal(marks.count(), 0); assert.equal(parent.children.length, 0);
});
