import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {wandAuraKind, particleAt, crackleAt, createWandAura, syncWandAura, WAND_AURAS, WAND_CLASS} from './wand-auras.js';

const wand = (label, extra = {}) => ({class: WAND_CLASS, name: 'wand of death', appearance: 'oak', label, ...extra});

test('only the hero-known name picks an aura', () => {
  assert.equal(wandAuraKind(wand('wand of death')), 'death');
  assert.equal(wandAuraKind(wand('wands of fire')), 'fire');
  assert.equal(wandAuraKind(wand('2 wands of cold')), 'cold');
  assert.equal(wandAuraKind(wand('wand of magic missile named zap')), 'magic missile');
  // Unidentified: the true name is right there on the object, and must not leak.
  assert.equal(wandAuraKind(wand('oak wand')), null);
  assert.equal(wandAuraKind(wand('wand')), null);
  assert.equal(wandAuraKind(wand(undefined)), null);
  assert.equal(wandAuraKind({class: WAND_CLASS, name: 'wand of death'}), null);
  // Player guesses and names are not identification.
  assert.equal(wandAuraKind(wand('wand called death')), null);
  assert.equal(wandAuraKind(wand('wand called wand of death')), null);
  assert.equal(wandAuraKind(wand('oak wand named wand of death')), null);
  // Nothing shows nothing; other classes never glow.
  assert.equal(wandAuraKind(wand('wand of nothing')), null);
  assert.equal(wandAuraKind({class: 6, label: 'wand of death'}), null);
});

test('every style keeps particles finite and near the wand', () => {
  const styles = Object.values(WAND_AURAS).flatMap(s => s.core ? [s, s.core] : [s]);
  for (const style of styles) for (let k = 0; k < 20; k++) {
    const seed = [k / 20, (k * 7 % 20) / 20, (k * 13 % 20) / 20, (k * 3 % 20) / 20];
    for (let p = 0; p <= 1.0001; p += .05) {
      const q = particleAt(style.motion, seed, Math.min(p, 1));
      for (const v of Object.values(q)) assert.ok(Number.isFinite(v), `${style.motion} ${JSON.stringify(q)}`);
      assert.ok(Math.abs(q.x) <= .45 && Math.abs(q.z) <= .3, `${style.motion} spread ${q.x},${q.z}`);
      assert.ok(q.y >= 0 && q.y <= .65, `${style.motion} height ${q.y}`);
      assert.ok(q.alpha >= 0 && q.alpha <= 1 && q.size > 0 && q.size <= 1.01);
    }
    // Born and gone invisible, so the loop never pops.
    assert.ok(particleAt(style.motion, [.3, .6, .2, .8], 0).alpha < 1e-6);
    assert.ok(particleAt(style.motion, [.3, .6, .2, .8], 1).alpha < 1e-6);
  }
});

test('lightning crackles in short flashes', () => {
  let on = 0, samples = 0, runs = 0, run = 0, longest = 0;
  for (let t = 0; t < 30; t += 1 / 240, samples++) {
    const c = crackleAt(t, 1234);
    assert.equal(c.pts.length, 21);
    assert.ok(c.pts.every(Number.isFinite));
    if (c.on) { on++; run++; } else { if (run) runs++; longest = Math.max(longest, run); run = 0; }
  }
  const share = on / samples;
  assert.ok(share > .02 && share < .15, `on ${share}`);
  assert.ok(runs > 30, `flashes ${runs}`);
  assert.ok(longest / 240 <= .08, `longest flash ${longest / 240}s`);
});

test('auras build, animate and dispose cleanly', () => {
  for (const kind of Object.keys(WAND_AURAS)) {
    const aura = createWandAura(kind, 'x');
    let meshes = 0;
    for (const t of [0, .37, 1.9, 12.5, 1000.1]) {
      aura.userData.update(t);
      aura.traverse(o => {
        if (!o.geometry) return;
        for (const attr of Object.values(o.geometry.attributes)) assert.ok(attr.array.every(Number.isFinite), kind);
      });
    }
    aura.traverse(o => { if (o.geometry) meshes++; });
    assert.ok(meshes >= 1 && meshes <= 3, `${kind} draw calls ${meshes}`);
    aura.userData.dispose();
  }
  // Same seed, same particles; the aura is a function of time.
  const a = createWandAura('fire', 'k'), b = createWandAura('fire', 'k');
  a.userData.update(3.3); b.userData.update(3.3);
  assert.deepEqual([...a.children[0].geometry.attributes.position.array], [...b.children[0].geometry.attributes.position.array]);
  assert.equal(createWandAura('nothing'), null);
});

test('the aura follows the name as it changes', () => {
  const item = new THREE.Group();
  assert.equal(syncWandAura(item, wand('oak wand')), null);
  assert.equal(item.children.length, 0);
  const death = syncWandAura(item, wand('wand of death'), 'k');
  assert.equal(death.userData.kind, 'death');
  assert.equal(syncWandAura(item, wand('wand of death'), 'k'), death, 'kept, not rebuilt');
  let freed = false;
  const dispose = death.userData.dispose;
  death.userData.dispose = () => { freed = true; dispose(); };
  const fire = syncWandAura(item, wand('wand of fire'), 'k');
  assert.ok(freed && fire.userData.kind === 'fire' && item.children.length === 1 && item.children[0] === fire);
  assert.equal(syncWandAura(item, wand('wand called fire')), null);
  assert.equal(item.children.length, 0);
});
