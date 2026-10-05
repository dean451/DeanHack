import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPoisonCloud} from './poison-cloud.js';
import {createGasRoil, gasState, GAS_HEAVE, GAS_CURL, GAS_DRIFT, gasGround, GAS_LAVA_GLOW, GAS_RIPPLE} from './poison-cloud-roil.js';
import {GAS_SPARKS} from './poison-gas-sparks.js';

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

function onGround(ground, seed = 4) {
  const scene = new THREE.Scene(), tile = new THREE.Group(), feature = new THREE.Group(), cloud = createPoisonCloud(seed);
  tile.userData.ground = ground;feature.add(cloud);tile.add(feature);scene.add(tile);
  return {scene, cloud, core: cloud.children.find(m => m.userData.part === 'core'), wisps: cloud.children.find(m => m.userData.part === 'wisps')};
}

test('gasGround stays in bounds and only lava glows, only water films', () => {
  for (let t = 0; t < 60; t += 1 / 30) {
    const lava = gasGround('lava', 'core', t, 2.1), water = gasGround('water', 'wisps', t, 2.1);
    assert(lava.glow >= 0 && lava.glow <= 1 && Math.abs(water.ripple - 1) <= GAS_RIPPLE + 1e-9);
  }
  assert.deepEqual(gasGround('floor', 'core', 5), {glow: 0, squash: 1, spread: 1, ripple: 1});
  assert.equal(gasGround('lava', 'wisps', 5).glow, 0);
  assert(gasGround('water', 'core', 5).squash < 1 && gasGround('water', 'core', 5).spread > 1);
});

test('gas over lava glows orange and over water clings low, and both restore exactly', () => {
  const lava = onGround('lava'), water = onGround('water'), plain = onGround('floor');
  const mats = [lava.core, water.core, water.wisps, plain.core].map(m => [m.material.emissive.getHex(), m.material.emissiveIntensity, m.material.opacity]);
  const restScale = water.core.scale.y;
  for (const w of [lava, water, plain]) {
    const roil = createGasRoil(w.scene);
    roil.update(1.3);
    w.roil = roil;
  }
  assert(lava.core.material.emissive.r > lava.core.material.emissive.g, 'lava lights the core orange');
  assert(lava.core.material.emissiveIntensity > mats[0][1] && lava.core.material.emissiveIntensity <= mats[0][1] + GAS_LAVA_GLOW);
  assert(water.core.scale.y < restScale * .75, 'over water the bank is squashed low');
  assert.equal(plain.core.material.emissive.getHex(), mats[3][0], 'plain floor leaves the glow alone');
  for (const w of [lava, water, plain]) w.roil.restore();
  [lava.core, water.core, water.wisps, plain.core].forEach((m, i) =>
    assert.deepEqual([m.material.emissive.getHex(), m.material.emissiveIntensity, m.material.opacity], mats[i]));
  assert.equal(water.core.scale.y, restScale);
});

test('gas over lava lets off sparks that stay in bounds, and restore removes them', () => {
  const lava = onGround('lava'), plain = onGround('floor');
  const roils = [lava, plain].map(w => { const r = createGasRoil(w.scene);w.roil = r;return r; });
  const sparkCount = w => w.scene.getObjectByName('GasSparks') ? 1 : 0;
  let lit = 0;
  for (let t = 0; t < 30; t += 1 / 30) {
    roils.forEach(r => r.update(t));
    const s = lava.scene.getObjectByName('GasSparks'), m = new THREE.Matrix4(), p = new THREE.Vector3(), k = new THREE.Vector3();
    assert.equal(s.count, GAS_SPARKS);
    for (let i = 0; i < s.count; i++) {
      s.getMatrixAt(i, m);m.decompose(p, new THREE.Quaternion(), k);
      if (k.x > 1e-3) lit++;
      assert(Math.hypot(p.x, p.z) < .35 && p.y >= 0 && p.y < .5, 'sparks stay near the bank');
    }
  }
  assert(lit > 0, 'some spark is in the air at some point');
  assert.equal(sparkCount(plain), 0, 'plain floor gets no sparks');
  roils.forEach(r => r.restore());
  assert.equal(sparkCount(lava), 0);
});
