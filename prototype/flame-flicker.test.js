import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLightItem} from './shop-visuals.js';
import {createCandelabrum} from './candelabrum.js';
import {createWatch} from './watch.js';
import {createFlameFlicker, flameState, FLAME_SCAN_EVERY} from './flame-flicker.js';

// The world position of the bottom centre of a flame's geometry (its root on the wick).
function root(mesh) {
  const box = mesh.geometry.boundingBox ?? (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox);
  mesh.updateWorldMatrix(true, false);
  return new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2).applyMatrix4(mesh.matrixWorld);
}

function snapshot(mesh) {
  return {p: mesh.position.toArray(), q: mesh.quaternion.toArray(), s: mesh.scale.toArray(), c: mesh.material.color.toArray(), e: mesh.material.emissiveIntensity};
}

test('flameState stays finite and bounded, and gutters now and then', () => {
  let gutters = 0;
  for (let t = 0; t < 60; t += 1 / 120) {
    const f = flameState(t, 1.3);
    for (const v of Object.values(f)) assert(Number.isFinite(v));
    assert(f.stretch > -.4 && f.stretch < .2, `stretch ${f.stretch}`);
    assert(Math.abs(f.leanX) <= .1 && Math.abs(f.leanZ) <= .1);
    assert(f.glow > .45 && f.glow < 1.25, `glow ${f.glow}`);
    if (f.stretch < -.2) gutters++;
  }
  assert(gutters > 0, 'the flame gutters at least once a minute');
});

test('lit lantern, candle, candelabrum and watchman flames flicker about their roots and restore exactly', () => {
  const scene = new THREE.Scene();
  const items = [createLightItem('a brass lantern (lit)'), createLightItem('a wax candle (lit)'), createCandelabrum({candles: 7, lit: true}), createWatch('watchman').g, createWatch('watchman').g, createLightItem('wax candle')];
  items.forEach((g, i) => {g.position.set(i * 2, 0, 0);scene.add(g);});
  const flicker = createFlameFlicker(scene), built = [];
  scene.traverse(o => {if (o.isMesh && o.userData.part === 'flame') built.push(o);});
  const before = new Map(built.map(f => [f, snapshot(f)]));
  const roots = new Map(built.map(f => [f, root(f)]));
  const baseColor = new Map(built.map(f => [f, f.material.color.clone()]));
  flicker.update(0);
  // Unlit candle has no flame: 2 shop flames, 1 merged candelabrum mesh, 2 watch lanterns.
  assert.equal(flicker.flames.length, 5);
  const seen = new Map(flicker.flames.map(f => [f, {minY: Infinity, maxY: -Infinity, glow: new Set()}]));
  for (let t = 0; t < 8; t += 1 / 60) {
    flicker.update(t);
    for (const f of flicker.flames) {
      for (const v of [...f.position.toArray(), ...f.scale.toArray(), ...f.quaternion.toArray()]) assert(Number.isFinite(v));
      const r = root(f), stat = seen.get(f);
      stat.minY = Math.min(stat.minY, f.scale.y);stat.maxY = Math.max(stat.maxY, f.scale.y);
      stat.glow.add(Math.round((f.material.isMeshBasicMaterial ? f.material.color.r / baseColor.get(f).r : f.material.emissiveIntensity) * 100));
      if (f.userData.flameRest.many) {
        assert.deepEqual(f.scale.toArray(), before.get(f).s, 'merged candelabrum flames only change brightness');
        continue;
      }
      assert(r.distanceTo(roots.get(f)) < 1e-6, `root stays on the wick (${r.distanceTo(roots.get(f))})`);
      assert(f.scale.y > .6 && f.scale.y < 1.2 && f.scale.x > .9 && f.scale.x < 1.2);
    }
  }
  for (const [f, s] of seen) {
    if (!f.userData.flameRest.many) assert(s.maxY - s.minY > .15, 'single flames stretch and shrink');
    assert(s.glow.size > 10, 'every flame brightens and dims');
  }
  // The two watchmen share one flame material; its rest glow isn't compounded.
  const watch = flicker.flames.filter(f => f.material.isMeshStandardMaterial);
  assert.equal(watch.length, 2);assert.equal(watch[0].material, watch[1].material);
  flicker.restore();
  for (const [f, s] of before) assert.deepEqual(snapshot(f), s);
  assert.equal(watch[0].material.emissiveIntensity, before.get(watch[0]).e);
});

test('flames that leave the scene are put back, and new ones are picked up on the next scan', () => {
  const scene = new THREE.Scene(), flicker = createFlameFlicker(scene);
  const a = createLightItem('a wax candle (lit)');scene.add(a);
  let built;a.traverse(o => {if (o.userData.part === 'flame') built = {p: o.position.clone(), s: o.scale.clone()};});
  flicker.update(0);flicker.update(.13);
  const flame = flicker.flames[0], rest = flame.userData.flameRest;
  assert(!flame.scale.equals(rest.scale), 'posed');
  scene.remove(a);
  const b = createLightItem('a brass lantern (lit)');scene.add(b);
  flicker.update(.13 + FLAME_SCAN_EVERY);
  assert.equal(flicker.flames.length, 1);assert.notEqual(flicker.flames[0], flame);
  assert(flame.scale.equals(built.s) && flame.position.equals(built.p), 'the removed candle flame is back at rest');
  assert.equal(flame.userData.flameRest, undefined);
});
