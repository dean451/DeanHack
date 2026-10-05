import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {wallPoint, crackPath, crackReach, createDigCracks, MAX_TILES, MAX_CRACKS, SEGS, GROW, HOLD, FADE} from './dig-cracks.js';

const BLOW = 'You hit the rock with all your might.';

test('cracks stay inside their tile, start near the middle and are jagged', () => {
  for (let seed = 1; seed < 20; seed++) for (let k = 0; k < MAX_CRACKS; k++) {
    const pts = crackPath(seed, k);
    assert.equal(pts.length, SEGS + 1);
    assert.ok(Math.hypot(...pts[0]) <= .15);
    for (const [x, z] of pts) assert.ok(Math.abs(x) <= .46 && Math.abs(z) <= .46);
  }
  assert.notDeepEqual(crackPath(1, 0), crackPath(1, 1));
});

test('a crack creeps out from nothing to its full length', () => {
  assert.equal(crackReach(0), 0);
  assert.equal(crackReach(GROW), SEGS);
  assert.equal(crackReach(GROW * 5), SEGS);
  let last = 0;
  for (let t = 0; t <= GROW; t += .01) { const r = crackReach(t); assert.ok(r >= last); last = r; }
});

test('each blow adds a crack, capped; the finishing strike takes them away', () => {
  const parent = new THREE.Group(), cracks = createDigCracks(THREE, parent);
  assert.equal(cracks.message('You hit the newt.', 0, 0), null);
  for (let i = 0; i < MAX_CRACKS + 3; i++) cracks.message(BLOW, 2, 3);
  for (let t = 0; t < GROW + .2; t += .1) cracks.update(.1);
  const s = cracks.update(0);
  assert.equal(s.tiles, 1);
  assert.equal(s.vertices, MAX_CRACKS * SEGS * 2);
  cracks.message('You dig a pit in the floor.', 2, 3);
  assert.equal(cracks.update(0).tiles, 0);
  assert.equal(cracks.update(0).vertices, 0);
  cracks.dispose();
});

test('tiles are capped, idle cracks fade out and clear empties everything', () => {
  const parent = new THREE.Group(), cracks = createDigCracks(THREE, parent);
  for (let i = 0; i < MAX_TILES + 2; i++) cracks.message(BLOW, i * 3, 0);
  assert.equal(cracks.update(.016).tiles, MAX_TILES);
  for (let t = 0; t < HOLD + FADE + 1; t += .1) cracks.update(.1);
  assert.equal(cracks.update(.1).tiles, 0);
  cracks.message(BLOW, 0, 0);
  cracks.clear();
  assert.equal(cracks.update(0).vertices, 0);
  cracks.dispose();
  assert.equal(parent.children.length, 0);
});

test('with a heading, cracks also split the wall face ahead of the hero', () => {
  for (const face of [0, 1, Math.PI / 2, Math.PI, -2]) for (let k = 0; k < MAX_CRACKS; k++) for (const p of crackPath(3, k)) {
    const w = wallPoint(p, face);
    assert.ok(w.y >= .06 && w.y <= .95);
    // it lies on the tile edge in the heading, never off to the side
    assert.ok(Math.abs(w.x * Math.sin(face) + w.z * Math.cos(face) - .47) < 1e-9);
  }
  const parent = new THREE.Group(), cracks = createDigCracks(THREE, parent);
  cracks.message(BLOW, 0, 0);
  for (let t = 0; t < GROW + .2; t += .1) cracks.update(.1);
  assert.equal(cracks.update(0).vertices, SEGS * 2);
  cracks.message(BLOW, 0, 0, 0);
  for (let t = 0; t < GROW + .2; t += .1) cracks.update(.1);
  assert.equal(cracks.update(0).vertices, SEGS * 4 * 2);
  cracks.dispose();
});
