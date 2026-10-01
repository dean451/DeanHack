import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';
import {flashCurve, twinkleAt, REST, REST_SIZE, PEAK_SIZE} from './gem-twinkle.js';

const gem = (name, appearance, color) => createGroundModel({class: 13, name, appearance, color});
const glintsOf = g => { let m = null; g.traverse(o => { if (o.userData.part === 'glints') m = o; }); return m; };

test('the flash rises fast, fades, and is zero outside', () => {
  let peak = 0;
  for (let i = 0; i <= 1000; i++) { const v = flashCurve(i / 1000); assert(v >= 0 && v <= 1); peak = Math.max(peak, v); }
  assert(peak > .99);
  assert.equal(flashCurve(0), 0); assert.equal(flashCurve(1), 0); assert.equal(flashCurve(NaN), 0);
});

test('stars rest faint and take turns flaring', () => {
  for (const seed of [1, 12345, 4000000000]) {
    const peaks = [0, 0, 0];
    for (let k = 0; k < 2000; k++) {
      const t = k * .01;
      const on = [0, 1, 2].map(i => twinkleAt(t, i, 3, seed));
      on.forEach((s, i) => {
        assert(Number.isFinite(s.glow) && s.glow >= REST - 1e-9 && s.glow <= 1, `${s.glow}`);
        assert(s.size >= REST_SIZE - 1e-9 && s.size <= PEAK_SIZE + 1e-9);
        peaks[i] = Math.max(peaks[i], s.glow);
      });
    }
    assert(peaks.every(p => p > .9), `every star flares (${peaks})`);
  }
  assert.deepEqual(twinkleAt(NaN, 0, 3, 1), twinkleAt(0, 0, 3, 1));
});

test('a floor gem lies on the floor with no disc under it, and twinkles like its glass', () => {
  for (const [look, color] of [['white', 15], ['red', 1], ['green', 2], ['blue', 4], ['violet', 5], ['black', 0]]) {
    const real = gem('ruby', look, color), glass = gem('worthless piece of red glass', look, color);
    real.updateMatrixWorld(true);
    let circles = 0; real.traverse(o => { if (o.geometry?.type === 'CircleGeometry') circles++; });
    assert.equal(circles, 0, `${look}: no disc`);
    const box = new THREE.Box3().setFromObject(real, true);
    assert(Math.abs(box.min.y) < 1e-6 && box.max.y < .16, `${look} rests on the floor: ${box.min.y}..${box.max.y}`);
    assert.equal(typeof real.userData.animate, 'function');
    for (const t of [0, .7, 1.9, 3.3, 11]) {
      real.userData.animate(t); glass.userData.animate(t);
      const a = glintsOf(real).geometry.attributes, b = glintsOf(glass).geometry.attributes;
      assert.deepEqual(Array.from(a.color.array), Array.from(b.color.array), `${look} same twinkle as its glass`);
      for (const v of a.position.array) assert(Number.isFinite(v));
    }
  }
});
