import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAltar} from './altar.js';
import {createAltarEmbers, sparkState, smokeState, glowAt, EMBER_SPARKS, EMBER_RISE, EMBER_REACH, EMBER_SIZE, SMOKE_PUFFS, SMOKE_RISE, SMOKE_OPACITY, SMOKE_SIZE, GLOW_RANGE} from './altar-embers.js';

test('sparks lift off now and then, stay finite and near the brazier, and cool and shrink out', () => {
  for (const phase of [0, .41, .83]) {
    let airborne = 0, samples = 0, maxAir = 0;
    for (let i = 0; i < EMBER_SPARKS; i++) {
      let prev = null, flights = 0;
      for (let t = 0; t < 60; t += 1 / 60) {
        const s = sparkState(t, i, phase);
        for (const v of Object.values(s)) assert.ok(Number.isFinite(v));
        if (s.life < 0) { assert.equal(s.size, 0);prev = null;continue; }
        assert.ok(s.y >= 0 && s.y <= EMBER_RISE[1] + 1e-9);
        assert.ok(Math.hypot(s.x, s.z) <= EMBER_REACH + 1e-9);
        assert.ok(s.size >= 0 && s.size <= EMBER_SIZE * 1.2 + 1e-9);
        assert.ok(s.heat >= 0 && s.heat <= 1);
        if (prev) assert.ok(Math.hypot(s.x - prev.x, s.y - prev.y, s.z - prev.z) < .02, 'no jumps mid-flight');
        else flights++;
        prev = s;
      }
      assert.ok(flights >= 8, `spark ${i} flies repeatedly`);
    }
    for (let t = 0; t < 60; t += .05) {
      let n = 0;for (let i = 0; i < EMBER_SPARKS; i++) if (sparkState(t, i, phase).life >= 0) n++;
      airborne += n;samples++;maxAir = Math.max(maxAir, n);
    }
    // Never a steady stream: a few at a time on average, never all at once.
    assert.ok(airborne / samples > .8 && airborne / samples < EMBER_SPARKS * .6, `mean ${airborne / samples}`);
    assert.ok(maxAir < EMBER_SPARKS);
  }
  // Each flight ends shrunk away and cooled, so it never pops out.
  for (let i = 0; i < EMBER_SPARKS; i++) {
    let prev = null, ends = 0;
    for (let t = 0; t < 30; t += 1 / 120) {
      const s = sparkState(t, i);
      if (prev && prev.life >= 0 && s.life < 0) { assert.ok(prev.size < EMBER_SIZE * .05 && prev.heat < .05);ends++; }
      prev = s;
    }
    assert.ok(ends > 0);
  }
});

test('smoke rises, spreads and fades without popping; coals breathe within range', () => {
  for (const phase of [0, .5]) for (let i = 0; i < SMOKE_PUFFS; i++) {
    let prev = null;
    for (let t = 0; t < 30; t += 1 / 60) {
      const s = smokeState(t, i, phase);
      for (const v of Object.values(s)) assert.ok(Number.isFinite(v));
      assert.ok(s.y >= 0 && s.y <= SMOKE_RISE + .03);
      assert.ok(s.size >= SMOKE_SIZE[0] - 1e-9 && s.size <= SMOKE_SIZE[1] + 1e-9);
      assert.ok(Math.abs(s.x) + s.size / 2 < .5 && Math.abs(s.z) + s.size / 2 < .5, 'inside the tile');
      assert.ok(s.opacity >= 0 && s.opacity <= SMOKE_OPACITY + 1e-9);
      // At the wrap the puff is invisible, so only check smoothness while it shows.
      if (prev && prev.opacity > 1e-3 && s.opacity > 1e-3) assert.ok(Math.abs(s.opacity - prev.opacity) < .004);
      prev = s;
    }
  }
  let lo = Infinity, hi = -Infinity, prev = null;
  for (let t = 0; t < 60; t += 1 / 60) {
    const g = glowAt(t, .3);
    assert.ok(g >= GLOW_RANGE[0] - 1e-9 && g <= GLOW_RANGE[1] + 1e-9);
    if (prev !== null) assert.ok(Math.abs(g - prev) < .03);
    lo = Math.min(lo, g);hi = Math.max(hi, g);prev = g;
  }
  assert.ok(hi - lo > .25, 'visibly breathes');
});

test('embers attach to altars above the coals, animate, and clean up and restore the glow', () => {
  const scene = new THREE.Scene(), a = createAltar(), b = createAltar();
  b.position.x = 3;scene.add(a, b);
  const coals = [];a.traverse(o => { if (o.isMesh && o.userData.part === 'coals') coals.push(o.material); });
  assert.equal(coals.length, 1);
  const base = coals[0].emissiveIntensity;
  const fx = createAltarEmbers(scene);
  fx.update(0);
  assert.equal(fx.embers.size, 2);
  const group = a.getObjectByName('AltarEmbers');
  assert.ok(group.position.y > .6 && group.position.y < .72, 'sits on the coal heap');
  assert.equal(group.children.length, 1 + SMOKE_PUFFS);
  fx.update(1.3);
  assert.notEqual(coals[0].emissiveIntensity, base);
  // Pose is finite over time.
  const m = new THREE.Matrix4(), p = new THREE.Vector3();
  for (let t = 0; t < 10; t += .1) {
    fx.update(t);
    const sparks = group.userData.sparks;
    for (let i = 0; i < EMBER_SPARKS; i++) { sparks.getMatrixAt(i, m);p.setFromMatrixPosition(m);assert.ok([p.x, p.y, p.z].every(Number.isFinite)); }
  }
  // Rescans don't add a second group.
  fx.update(11);
  assert.equal(a.children.filter(c => c.name === 'AltarEmbers').length, 1);
  // An altar that leaves loses its embers and gets its own glow back.
  let disposed = 0;
  for (const s of group.userData.puffs) s.material.addEventListener('dispose', () => disposed++);
  scene.remove(a);
  fx.update(12);
  assert.equal(fx.embers.size, 1);
  assert.equal(group.parent, null);
  assert.equal(disposed, SMOKE_PUFFS);
  assert.equal(coals[0].emissiveIntensity, base);
  fx.restore();
  assert.equal(fx.embers.size, 0);
  assert.equal(b.getObjectByName('AltarEmbers'), undefined);
});
