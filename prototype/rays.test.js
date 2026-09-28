import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline, FX_TICK_MS} from './fx.js';
import {RAY_LOOKS, RAY_FADE_MS, SPARK_MS, RAY_Y, rayLook, rayBounces, rayFrame, raySparks, createRays} from './rays.js';

const zap = (type, dir) => ({kind: 'zap', zap: type, dir});
// A fire bolt going east from x=3, hitting a wall past x=6 and coming back to x=4.
const bolt = (type = 'fire') => fxTimeline({steps: [
  {op: 'start', mode: 'beam', glyph: 1, effect: zap(type, 'horizontal')},
  ...[3, 4, 5, 6, 6, 5, 4].flatMap(x => [{op: 'draw', x, z: 2}, {op: 'tick'}]),
  {op: 'end'},
]});

test('every zap type has a finite look and anything else has none', () => {
  for (const [name, L] of Object.entries(RAY_LOOKS)) {
    assert.equal(rayLook(zap(name, 'vertical')), L);
    for (const k of ['width', 'glowWidth']) assert.ok(Number.isFinite(L[k]) && L[k] > 0 && L[k] < .5, `${name}.${k}`);
    assert.ok(L.flicker >= 0 && L.flicker < 1, `${name}.flicker`);
  }
  assert.equal(rayLook({kind: 'object', otyp: 3}), null);
  assert.equal(rayLook({kind: 'zap', zap: 'banana'}), null);
  assert.equal(rayLook(null), null);
});

test('a wall bounce is found where the beam turns, at the wall edge', () => {
  const b = rayBounces(bolt());
  assert.equal(b.length, 1);
  assert.equal(b[0].x, 6.5); assert.equal(b[0].z, 2);
  assert.equal(b[0].t, 4 * FX_TICK_MS);
  assert.deepEqual(b[0].outDir, [-1, 0]);
  assert.equal(b[0].back, true);
  // A diagonal glancing off a wall turns without reversing.
  const glance = fxTimeline({steps: [{op: 'start', mode: 'beam', glyph: 1, effect: zap('cold', 'lslant')},
    ...[[1, 1], [2, 2], [3, 3], [4, 2], [5, 1]].flatMap(([x, z]) => [{op: 'draw', x, z}, {op: 'tick'}]), {op: 'end'}]});
  const g = rayBounces(glance);
  assert.equal(g.length, 1);
  assert.equal(g[0].back, false);
  assert.deepEqual(g[0].outDir, [1, -1]);
  // Thrown objects are not rays.
  assert.equal(rayBounces(fxTimeline({steps: [{op: 'start', mode: 'flash', effect: {kind: 'object'}},
    {op: 'draw', x: 1, z: 1}, {op: 'tick'}, {op: 'draw', x: 2, z: 1}, {op: 'tick'}, {op: 'end'}]})).length, 0);
});

test('the beam grows cell by cell, keeps its trail, then fades to nothing', () => {
  const tl = bolt('lightning');
  const counts = [];
  for (let t = 0; t <= tl.duration + RAY_FADE_MS + 20; t += 10) {
    const segs = rayFrame(tl, t);
    for (const s of segs) {
      for (const k of ['x', 'z', 'yaw', 'intensity', 'offset']) assert.ok(Number.isFinite(s[k]), k);
      assert.ok(s.intensity >= 0 && s.intensity <= 1);
      assert.ok(Math.abs(s.offset) <= RAY_LOOKS.lightning.jag + 1e-9);
    }
    assert.ok(segs.filter(s => s.head).length <= 1);
    counts.push(segs.length);
  }
  assert.equal(counts[0], 1);
  assert.equal(Math.max(...counts), 7);
  assert.equal(counts.at(-1), 0);
  assert.ok(rayFrame(tl, tl.duration + RAY_FADE_MS / 2).every(s => s.intensity < .6));
});

test('sparks fly from the bounce, fall, stay near it and die out', () => {
  const b = rayBounces(bolt());
  assert.equal(raySparks(b, b[0].t - 1).length, 0);
  assert.equal(raySparks(b, b[0].t + SPARK_MS).length, 0);
  for (let t = b[0].t; t < b[0].t + SPARK_MS; t += 16) {
    for (const s of raySparks(b, t)) {
      for (const k of ['x', 'y', 'z', 'alpha']) assert.ok(Number.isFinite(s[k]), k);
      assert.ok(Math.hypot(s.x - 6.5, s.z - 2) < 1.1);
      assert.ok(s.y >= .02 && s.y < RAY_Y + .3);
      assert.ok(s.alpha > 0 && s.alpha <= 1);
      // A reflection straight back throws its sparks back the way the beam came.
      assert.ok(s.x <= 6.5 + 1e-9);
    }
  }
});

test('createRays draws a replay and ends empty', () => {
  const parent = new THREE.Group();
  const rays = createRays(THREE, parent);
  assert.equal(rays.play(fxTimeline({steps: [{op: 'start', mode: 'flash', effect: {kind: 'object'}}, {op: 'draw', x: 1, z: 1}, {op: 'tick'}, {op: 'end'}]})), false);
  assert.equal(rays.play(bolt('death')), true);
  let peak = 0;
  for (let i = 0; i < 60; i++) {
    const drawn = rays.update(1 / 60, {x: 3, z: 2});
    peak = Math.max(peak, drawn);
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let j = 0; j < rays.core.count; j++) {
      rays.core.getMatrixAt(j, m); p.setFromMatrixPosition(m);
      assert.ok(p.x >= -.5 && p.x <= 3.5 && Math.abs(p.z) < .2 && p.y === RAY_Y);
    }
  }
  assert.ok(peak >= 7);
  assert.equal(rays.active, 0);
  assert.equal(rays.core.count, 0);
  assert.equal(rays.sparks.geometry.drawRange.count, 0);
  rays.play(bolt()); rays.update(.1, null); rays.clear();
  assert.equal(rays.core.count, 0);
  rays.dispose();
  assert.equal(parent.children.length, 0);
});
