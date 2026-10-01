import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import * as F from './light-flare.js';

const dt = 1 / 60;
function mon(name, symbol = 'y', color = 3) { const a = createCreature({name, symbol: symbol.charCodeAt(0), color}); a.species = name; return a; }
const pose = a => [...a.lift.position.toArray(), ...a.halo.scale.toArray(), a.halo.material.opacity, a.ring.rotation.y,
  ...a.ring.children.flatMap(m => [...m.position.toArray(), ...m.scale.toArray()])];
const LIGHTS = [['yellow light', 'yellow'], ['black light', 'black']];

test('lights flare; other creatures do not', () => {
  for (const [name, kind] of LIGHTS) {
    const a = mon(name);
    assert.equal(a.light, kind, name);
    assert.ok(a.ring?.parent === a.lift && a.halo?.parent === a.lift && a.ring.children.length === 6, name);
    assert.ok(F.flares(a), name);
    assert.ok(F.updateLightFlare(a, dt, 0, false), name);
  }
  for (const [name, s] of [['shocking sphere', 'e'], ['floating eye', 'e'], ['ghost', ' ']]) assert.equal(F.updateLightFlare(mon(name, s), dt, 0, false), null, name);
});

test('the flare and gutter envelopes stay in bounds', () => {
  for (let u = -.1; u <= 1.1; u += .005) { const f = F.flareAt(u); assert.ok(f >= 0 && f <= 1, `${u}`); }
  assert.equal(F.flareAt(0), 0); assert.equal(F.flareAt(1), 0);
  for (let t = 0; t < 60; t += .01) { const g = F.gutterAt(t, 1.3); assert.ok(g >= .55 && g <= 1.15, `${t}`); }
});

test('it leans toward the hero', () => {
  const a = mon('yellow light'), rest = a.lift.position.clone();
  for (let i = 0; i < 60 * 8; i++) F.updateLightFlare(a, dt, i * dt, true, new THREE.Vector3(2, 0, 0));
  const lean = a.lift.position.x - rest.x;
  assert.ok(lean > .02 && lean < .12, `lean ${lean}`);
});

test('each light flickers, flares, gutters, swells and rests after death', () => {
  for (const [name, kind] of LIGHTS) {
    const a = mon(name), hero = new THREE.Vector3(3, 0, 1);
    const rest = pose(a);
    F.updateLightFlare(a, 0, 0, false, hero);
    const st = a.lightFlare;
    let t = 0, flares = 0, was = false, step = 0, haloHi = 1, gutHalo = 2, glowLo = Infinity, glowHi = -Infinity, atkGlow = 0, gutGlow = Infinity, lift = 0, spin = 0, atkStep = 0;
    let prev = pose(a);
    for (let i = 0; i < 60 * 30; i++) {
      t += dt;
      if (i === 60 * 20) a.actions = {current: {kind: 'hit'}};
      if (i === 60 * 20 + 10) a.actions = null;
      if (i >= 60 * 22 && i < 60 * 22 + 40) a.actions = {current: {kind: 'attack'}, age: 0, u: (i - 60 * 22) / 40};
      if (i === 60 * 22 + 40) a.actions = null;
      F.updateLightFlare(a, dt, t, i % 600 > 540, hero);
      if (st.flare != null && !was) flares++;
      was = st.flare != null;
      const now = pose(a);
      assert.ok(now.every(Number.isFinite), `${name} ${i}`);
      // a black light's motes wrap from the core back to the halo's edge (scaled to nothing), so
      // only check positions for steps on the yellow one; the ring's spin is checked on its own
      // the burst swells the halo fast on purpose, so the attack gets a looser limit
      const d = Math.max(...now.map((v, k) => k === 7 || (kind === 'black' && k > 7) ? 0 : Math.abs(v - prev[k])));
      if (i >= 60 * 22 && i <= 60 * 22 + 40) atkStep = Math.max(atkStep, d); else step = Math.max(step, d);
      spin = Math.max(spin, Math.abs(wrapD(now[7] - prev[7])));
      prev = now;
      const e = a.core.material.emissiveIntensity, hs = a.halo.scale.x / rest[3];
      glowLo = Math.min(glowLo, e); glowHi = Math.max(glowHi, e);
      haloHi = Math.max(haloHi, hs);
      lift = Math.max(lift, Math.hypot(a.lift.position.x - rest[0], a.lift.position.y - rest[1], a.lift.position.z - rest[2]));
      if (i > 60 * 20 && i < 60 * 20 + 15) { gutHalo = Math.min(gutHalo, hs); gutGlow = Math.min(gutGlow, e); }
      if (i > 60 * 22 && i < 60 * 22 + 40) atkGlow = Math.max(atkGlow, e);
      for (const m of a.ring.children) assert.ok(m.position.length() < .6 && m.scale.x >= 0 && m.scale.x < 2, `${name} mote ${i}`);
      assert.ok(a.halo.material.opacity > 0 && a.halo.material.opacity < .7, `${name} opacity ${i}`);
    }
    assert.ok(flares >= 2, `${name} flares ${flares}`);
    assert.ok(step < .08, `${name} step ${step}`);
    assert.ok(spin < .12, `${name} spin ${spin}`);
    assert.ok(atkStep < .2, `${name} burst step ${atkStep}`);
    assert.ok(haloHi > 1.4 && haloHi < 2.4, `${name} halo ${haloHi}`);
    assert.ok(gutHalo < .95, `${name} gutter halo ${gutHalo}`);
    assert.ok(glowLo >= .4 && glowHi < 20 && atkGlow > 9, `${name} glow ${glowLo} ${glowHi} ${atkGlow}`);
    assert.ok(gutGlow < 3, `${name} gutter glow ${gutGlow}`);
    assert.ok(lift < .25, `${name} lift ${lift}`);
    a.actions = {dead: true};
    for (let i = 0; i < 60 * 6; i++) { t += dt; F.updateLightFlare(a, dt, t, false, hero); }
    const now = pose(a);
    rest.forEach((v, k) => assert.ok(Math.abs(now[k] - v) < 1e-6, `${name} ${k} ${now[k]} ${v}`));
    assert.ok(Math.abs(a.core.material.emissiveIntensity - F.CORE_BASE) < 1e-6, name);
  }
});

function wrapD(v) { return Math.atan2(Math.sin(v), Math.cos(v)); }
