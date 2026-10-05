import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPoisonCloud} from './poison-cloud.js';
import {createGasRoil, gasState, GAS_HEAVE, GAS_CURL, GAS_DRIFT} from './poison-cloud-roil.js';

const snap = m => [...m.position.toArray(), m.rotation.y, ...m.scale.toArray()];

test('gasState stays finite and in bounds, and the wisps turn against the core, faster', () => {
  for (const part of ['core', 'wisps']) {
    for (let t = 0; t < 120; t += 1 / 30) {
      const s = gasState(part, t, 1.7);
      for (const v of Object.values(s)) assert(Number.isFinite(v));
      const hv = part === 'core' ? GAS_HEAVE : GAS_CURL;
      assert(Math.abs(s.sy - 1) <= hv + 1e-9 && Math.abs(s.sxz - 1) <= hv + 1e-9);
      assert(Math.hypot(s.dx, s.dz) <= GAS_DRIFT * 3);
    }
  }
  const core = gasState('core', 50), wisp = gasState('wisps', 50);
  assert(core.spin > 0 && wisp.spin < 0 && Math.abs(wisp.spin) > core.spin);
});

test('poison clouds in the scene roil, differ from one another, and restore exactly', () => {
  const scene = new THREE.Scene(), clouds = [createPoisonCloud(3), createPoisonCloud(8)];
  clouds.forEach((c, i) => { c.position.set(i * 2, 0, 0);scene.add(c); });
  const meshes = clouds.flatMap(c => c.children), rest = meshes.map(snap);
  const roil = createGasRoil(scene);
  let moved = 0;
  for (let t = 0; t < 20; t += 1 / 30) {
    roil.update(t);
    if (snap(meshes[0]).some((v, i) => Math.abs(v - rest[0][i]) > 1e-4)) moved++;
  }
  assert(moved > 100, 'the gas keeps moving');
  assert.equal(roil.meshes.length, 4);
  assert(Math.abs(meshes[0].rotation.y - meshes[2].rotation.y) > 1e-6 || Math.abs(meshes[0].position.x - meshes[2].position.x) > 1e-6, 'clouds are out of step');
  const box = new THREE.Box3().setFromObject(clouds[0]);
  assert(box.min.x > -.9 && box.max.x < .9 && box.max.y < 1.2, 'roiling keeps the gas over its tile');
  roil.restore();
  meshes.forEach((m, i) => assert.deepEqual(snap(m), rest[i]));
});

test('a cloud removed from the scene is put back to rest and dropped', () => {
  const scene = new THREE.Scene(), c = createPoisonCloud(5);
  scene.add(c);
  const roil = createGasRoil(scene), r = c.children.map(snap);
  roil.update(3);
  scene.remove(c);
  roil.update(4);
  assert.equal(roil.meshes.length, 0);
  c.children.forEach((m, i) => assert.deepEqual(snap(m), r[i]));
});
