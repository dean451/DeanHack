import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGrave} from './grave.js';
import {createGraveMist, wispState, MIST_WISPS, MIST_OPACITY, MIST_Y, MIST_REACH} from './grave-mist.js';

test('grave mist wisps stay low, faint, finite and inside the tile, and drift smoothly', () => {
  for (const phase of [0, .37, .91]) for (let i = 0; i < MIST_WISPS; i++) {
    let prev = null, lo = Infinity, hi = -Infinity;
    for (let t = 0; t < 200; t += 1 / 60) {
      const s = wispState(t, i, phase);
      for (const v of Object.values(s)) assert.ok(Number.isFinite(v));
      assert.ok(s.y >= MIST_Y[0] - .007 && s.y <= MIST_Y[1] + .007);
      assert.ok(s.opacity > 0 && s.opacity <= MIST_OPACITY + 1e-9);
      assert.ok(Math.hypot(s.x, s.z) + Math.max(s.sx, s.sz) / 2 <= MIST_REACH + 1e-9);
      if (prev) {
        assert.ok(Math.hypot(s.x - prev.x, s.z - prev.z) < .003, 'no jumps');
        assert.ok(Math.abs(s.opacity - prev.opacity) < .002, 'no pops');
      }
      lo = Math.min(lo, s.opacity);hi = Math.max(hi, s.opacity);prev = s;
    }
    assert.ok(hi - lo > MIST_OPACITY * .5, 'fades in and out');
  }
  // Wisps of one grave are out of step.
  const ops = Array.from({length: MIST_WISPS}, (_, i) => wispState(3, i).opacity);
  assert.ok(Math.max(...ops) - Math.min(...ops) > .02);
});

test('grave mist attaches to graves in the scene and cleans up when they leave', () => {
  const scene = new THREE.Scene(), a = createGrave(1), b = createGrave(2);
  scene.add(a, b);
  const mist = createGraveMist(scene);
  mist.update(0);
  assert.equal(mist.mists.size, 2);
  const group = a.getObjectByName('GraveMist');
  assert.equal(group.children.length, MIST_WISPS);
  mist.update(1 / 60);
  const w = group.children[0];
  assert.ok(w.material.opacity > 0 && w.position.y > 0);
  // Two graves drift differently.
  const wb = b.getObjectByName('GraveMist').children[0];
  assert.ok(w.position.distanceTo(wb.position) > 1e-4 || w.material.opacity !== wb.material.opacity);
  // Rescans don't add a second mist.
  mist.update(2);
  assert.equal(a.children.filter(c => c.name === 'GraveMist').length, 1);
  // A grave that leaves loses its mist.
  let disposed = 0;
  for (const m of group.children) m.material.addEventListener('dispose', () => disposed++);
  scene.remove(a);
  mist.update(3);
  assert.equal(mist.mists.size, 1);
  assert.equal(a.getObjectByName('GraveMist'), undefined);
  assert.equal(disposed, MIST_WISPS);
  mist.restore();
  assert.equal(b.getObjectByName('GraveMist'), undefined);
  assert.equal(mist.mists.size, 0);
});
