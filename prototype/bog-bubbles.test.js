import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBog} from './bog.js';
import {createTerrainFeature} from './terrain-feature.js';
import {createBogBubbles, bubbleState, BUBBLE_SLOTS, BUBBLE_SIZE, BUBBLE_SPOT, RING_RIM} from './bog-bubbles.js';

test('bog hands over its pools and water level', () => {
  for (const seed of [0, 7, 41 * 3 + 23 * 5]) {
    const bog = createBog(seed);
    assert.ok(bog.userData.pools.length >= 2 && bog.userData.pools.length <= 3);
    for (const p of bog.userData.pools) for (const k of ['x', 'z', 'r', 'sx']) assert.ok(Number.isFinite(p[k]));
    assert.ok(Number.isFinite(bog.userData.water));
    bog.userData.dispose();
  }
});

test('domes swell and pop, rings spread and fade inside the pool, and each slot rests between', () => {
  const pools = [];
  for (const seed of [0, 3, 11, 29, 173]) { const b = createBog(seed);pools.push(...b.userData.pools);b.userData.dispose(); }
  for (const pool of pools) for (const phase of [0, .37, .91]) {
    const inner = RING_RIM * pool.r * Math.min(pool.sx, 1 / pool.sx);
    for (let i = 0; i < BUBBLE_SLOTS * 3; i++) {
      let prev = null, pops = 0, busy = 0, samples = 0;
      for (let t = 0; t < 90; t += 1 / 60) {
        const s = bubbleState(t, i, pool, phase);
        for (const k of ['x', 'z', 'size', 'ring', 'fade']) assert.ok(Number.isFinite(s[k]));
        const off = Math.hypot(s.x - pool.x, s.z - pool.z);
        assert.ok(off <= BUBBLE_SPOT * pool.r * Math.max(pool.sx, 1 / pool.sx) + 1e-9);
        assert.ok(s.size >= 0 && s.size <= BUBBLE_SIZE[1] * 1.16);
        assert.ok(s.fade >= 0 && s.fade <= 1);
        // The ring stays inside the rim, or at most just past a tiny bubble's own reach.
        if (s.ring > 0) assert.ok(off + s.ring <= Math.max(inner, off + BUBBLE_SIZE[1] * 1.6) + 1e-9, `ring ${off + s.ring} vs rim ${inner}`);
        if (prev?.stage === 'dome' && s.stage === 'ring') {
          pops++;
          assert.ok(prev.size > BUBBLE_SIZE[0] * .9, 'pops at full size');
          assert.ok(Math.abs(s.ring - prev.size) < BUBBLE_SIZE[1] * .3, 'ring starts where the dome was');
        }
        if (prev?.stage === 'ring' && s.stage !== 'ring') assert.ok(prev.fade < .02, 'ring has faded out before it goes');
        if (prev?.stage === 'rest' && s.stage === 'dome') assert.ok(s.size < BUBBLE_SIZE[1] * .15, 'dome wells up from nothing');
        if (prev?.stage === 'dome' && s.stage === 'dome') assert.ok(Math.abs(s.size - prev.size) < .003, 'no jumps while swelling');
        if (prev?.stage === 'ring' && s.stage === 'ring') assert.ok(s.ring >= prev.ring - 1e-12 && s.fade <= prev.fade + 1e-12);
        if (s.stage !== 'rest') busy++;
        samples++;prev = s;
      }
      assert.ok(pops >= 6, `slot ${i} bubbles repeatedly (${pops})`);
      // Gurgles, never boils: mostly at rest.
      assert.ok(busy / samples < .5, `busy ${busy / samples}`);
    }
  }
});

test('the effect finds bogs, follows their world matrix, hides with them and cleans up', () => {
  const scene = new THREE.Scene();
  const a = createTerrainFeature('bog', 5), b = createTerrainFeature('bog', 9);
  a.position.set(3, 0, -2);b.position.set(-4, 0, 1);b.scale.setScalar(1.4);
  scene.add(a, b);
  const fx = createBogBubbles(scene);
  const slots = [a, b].reduce((s, f) => s + f.children[0].userData.pools.length * BUBBLE_SLOTS, 0);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let seenDome = false, seenRing = false;
  for (let t = 0; t < 30; t += 1 / 30) {
    scene.updateMatrixWorld(true);
    fx.update(t);
    const {domes, rings} = fx.meshes;
    assert.equal(domes.count, slots);assert.equal(rings.count, slots);
    for (let i = 0; i < slots; i++) for (const mesh of [domes, rings]) {
      mesh.getMatrixAt(i, m);m.decompose(p, q, sc);
      for (const v of [p.x, p.y, p.z, sc.x, sc.y, sc.z]) assert.ok(Number.isFinite(v));
      if (sc.x === 0) continue;
      if (mesh === domes) seenDome = true;else seenRing = true;
      // Every visible instance sits on one of the two bog tiles, at the water.
      const home = i < a.children[0].userData.pools.length * BUBBLE_SLOTS ? a : b;
      assert.ok(Math.abs(p.x - home.position.x) < .5 * home.scale.x && Math.abs(p.z - home.position.z) < .5 * home.scale.x, 'on its tile');
      assert.ok(p.y > 0 && p.y < .04);
    }
  }
  assert.ok(seenDome && seenRing);
  assert.equal(scene.children.filter(o => o.isInstancedMesh).length, 2, 'two draws for all bogs');
  // A hidden cell shows nothing.
  a.visible = false;b.visible = false;
  fx.update(31);
  assert.equal(fx.meshes.domes.count, 0);
  // Gone from the scene after a rescan, then restore removes the meshes.
  a.visible = b.visible = true;
  scene.remove(a);fx.update(40);
  assert.equal(fx.bogs.length, 1);
  fx.restore();
  assert.equal(scene.children.filter(o => o.isInstancedMesh).length, 0);
  a.userData.dispose();b.userData.dispose();
});
