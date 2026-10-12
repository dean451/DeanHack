import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {POTION_AURAS, createPotionAura} from './potion-auras.js';
import {SCROLL_AURAS, createScrollAura} from './scroll-auras.js';
import {RING_AURAS, createRingAura} from './ring-auras.js';
import {AMULET_AURAS, createAmuletAura} from './amulet-auras.js';
import {ARMOR_AURAS, createArmorAura} from './armor-auras.js';
import {TOOL_AURAS, createToolAura} from './tool-auras.js';
import {WEAPON_MAX_SPE, createWeaponAura} from './weapon-auras.js';

// A budget for the floor-item effects (the point-layer auras), so glow cannot slowly drag the frame
// rate down. Each aura is built headlessly and stepped through a few seconds of its animation.
// Auras carry no lights; each point layer is one draw call.
const BUDGET = {
  pointsPerAura: 20, // today the busiest has 16
  layersPerAura: 3, // today 2 (a scroll with a core)
  drawsPerAura: 6, // today 5 (a scroll's puddle)
  busyAuras: 40, // a floor with this many glowing items at once
  busyPoints: 400,
};

const families = [
  ['potion', Object.keys(POTION_AURAS), k => createPotionAura(k)],
  ['scroll', Object.keys(SCROLL_AURAS), k => createScrollAura(k)],
  ['ring', Object.keys(RING_AURAS), k => createRingAura(k)],
  ['amulet', Object.keys(AMULET_AURAS), k => createAmuletAura(k)],
  ['armor', Object.keys(ARMOR_AURAS), k => createArmorAura(k)],
  ['tool', Object.keys(TOOL_AURAS), k => createToolAura(k)],
  ['weapon', Array.from({length: WEAPON_MAX_SPE}, (_, i) => i + 1), k => createWeaponAura(k)],
];

function measure(g) {
  let points = 0, layers = 0, draws = 0, lights = 0;
  g.traverse(o => {
    if (o.isLight) lights++;
    if (o.isPoints) { layers++; draws++; points += o.geometry.attributes.position.count; } else if (o.isMesh) draws++;
  });
  return {points, layers, draws, lights};
}

test('every floor-item aura stays under the per-aura caps and carries no lights', () => {
  let seen = 0;
  for (const [family, kinds, make] of families) {
    assert.ok(kinds.length > 0, `${family} has auras`);
    for (const kind of kinds) {
      const g = make(kind);
      assert.ok(g, `${family} ${kind} builds`);
      for (const t of [0, .7, 2.3, 5]) g.userData.update(t);
      const m = measure(g);
      assert.equal(m.lights, 0, `${family} ${kind} adds lights`);
      assert.ok(m.points <= BUDGET.pointsPerAura, `${family} ${kind}: ${m.points} points`);
      assert.ok(m.layers <= BUDGET.layersPerAura, `${family} ${kind}: ${m.layers} layers`);
      assert.ok(m.draws <= BUDGET.drawsPerAura, `${family} ${kind}: ${m.draws} draws`);
      g.userData.dispose();
      seen++;
    }
  }
  assert.ok(seen >= 40);
});

test('a floor of glowing items stays inside the aura budget', () => {
  const scene = new THREE.Scene();
  let n = 0;
  for (const [, kinds, make] of families) for (const kind of kinds) {
    if (n++ >= BUDGET.busyAuras) break;
    scene.add(make(kind));
  }
  const m = measure(scene);
  assert.ok(m.points <= BUDGET.busyPoints, `${m.points} points in a busy floor`);
  assert.equal(m.lights, 0);
});
