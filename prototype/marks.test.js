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

test('what is left follows the species: boneless things bleed, dry undead leave bone on dust, lights and elementals leave nothing', () => {
  const kinds = ev => marksFor(ev).map(m => m.kind);
  assert.deepEqual(kinds({type: 'death', x: 1, z: 1, name: 'floating eye'}), ['pool']);
  assert.deepEqual(kinds({type: 'death', x: 1, z: 1, name: 'giant beetle'}), ['pool']);
  const skel = kinds({type: 'death', x: 1, z: 1, name: 'skeleton'});
  assert.equal(skel[0], 'dust'); assert.ok(skel.filter(x => x === 'bone').length >= 3); assert.ok(!skel.includes('pool'));
  assert.deepEqual(kinds({type: 'combat', x: 1, z: 1, name: 'barrow wight'}), ['chip']);
  for (const name of ['yellow light', 'black light', 'fire elemental', 'earth elemental', 'energy vortex', 'blue jelly', 'stone golem', 'ghost', 'gas spore'])
    assert.deepEqual(kinds({type: 'death', x: 1, z: 1, name}), [], name), assert.deepEqual(kinds({type: 'combat', x: 1, z: 1, name}), [], name);
  // the shards come in three shapes, picked deterministically
  const shapes = marksFor({type: 'death', x: 9, z: 2, name: 'human zombie'}).filter(m => m.kind === 'bone').map(m => m.shape);
  assert.ok(shapes.every(s => Number.isInteger(s) && s >= 0 && s < 3));
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
  assert.ok(new Set(parent.children.map(m => m.geometry)).size <= 6);
  for (const m of parent.children) { assert.ok(m.position.y > 0 && m.position.y < .05); assert.equal(m.material.depthWrite, false); }
  marks.update(NaN);
  marks.clear();
  assert.equal(marks.count(), 0); assert.equal(parent.children.length, 0);
});

test('over the cap the stains fade before the bones, and the total stays capped', () => {
  const parent = new THREE.Group(), marks = createMarks(THREE, parent, {cap: 12});
  for (let i = 0; i < 3; i++) marks.add({type: 'death', x: i, z: 1});
  const bones = marks.bones();
  assert.ok(bones >= 6);
  for (let i = 0; i < 30; i++) marks.add({type: 'combat', x: i, z: 9});
  assert.equal(marks.solid(), 12);
  assert.equal(marks.bones(), bones);
});

test('blood settles in smooth puddles, never spiky stars', async () => {
  const {puddleRadius, SPLAT_SIDES} = await import('./marks.js');
  for (const seed of [1, 2, 3]) {
    const r = [...Array(SPLAT_SIDES)].map((_, i) => puddleRadius(seed, i / SPLAT_SIDES * Math.PI * 2));
    for (let i = 0; i < r.length; i++) assert(Math.abs(r[i] - r[(i + 1) % r.length]) < .12, `seed ${seed} step ${i}`);
    assert(Math.min(...r) > .45 && Math.max(...r) < 1.1);
  }
  assert(KINDS.splat.r < .15 && KINDS.splat.opacity < .6, 'a hit leaves only a small, quiet puddle');
});
