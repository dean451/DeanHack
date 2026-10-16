import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMarks, MARK_MAX, FADE_S} from './marks.js';

// A budget for the persistent combat marks: a long brawl must not grow the scene without bound.
// Each mark is one flat draw call, with no lights, and the geometry is shared.
const BUDGET = {
  peakDraws: 100, // today 79 in a kill every fifth hit at 20 events a second: the cap plus marks still fading out
  geometries: 4, // three splat shapes and the bone shard
};

function brawl(events) {
  const parent = new THREE.Group(), marks = createMarks(THREE, parent);
  let peak = 0;
  for (let i = 0; i < events; i++) {
    marks.add({type: i % 5 === 4 ? 'death' : 'hit', x: i % 17, z: i % 11});
    marks.update(.05);
    peak = Math.max(peak, parent.children.length);
  }
  return {parent, marks, peak};
}

test('a long brawl keeps the mark draws under the budget', () => {
  const {parent, marks, peak} = brawl(400);
  assert.ok(peak <= BUDGET.peakDraws, `peak ${peak} draws`);
  assert.equal(marks.solid() <= MARK_MAX, true);
  assert.equal(parent.children.length, marks.count());
});

test('marks carry no lights and share a handful of geometries', () => {
  const {parent} = brawl(200);
  const geos = new Set();
  parent.traverse(o => { assert.equal(o.isLight, undefined); if (o.isMesh) geos.add(o.geometry); });
  assert.ok(geos.size <= BUDGET.geometries, `${geos.size} geometries`);
});

test('the oldest marks fade away, leaving only the cap', () => {
  const {marks} = brawl(300);
  for (let t = 0; t < FADE_S * 2; t += .1) marks.update(.1);
  assert.equal(marks.count(), MARK_MAX);
});

test('clear empties the scene', () => {
  const {parent, marks} = brawl(100);
  marks.clear();
  assert.equal(parent.children.length, 0);
});
