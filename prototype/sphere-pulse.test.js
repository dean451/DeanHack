import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import * as P from './sphere-pulse.js';

const dt = 1 / 60;
function mon(name, symbol, color = 2) { const a = createCreature({name, symbol: symbol.charCodeAt(0), color}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const pose = a => a.orb.rotation.toArray().slice(0, 3).concat(a.orb.scale.toArray());
const SPHERES = [['gas spore', 'gas'], ['flaming sphere', 'fire'], ['freezing sphere', 'frost'], ['shocking sphere', 'shock']];

test('spheres pulse; other creatures do not', () => {
  for (const [name, kind] of SPHERES) {
    const a = mon(name, 'e');
    assert.equal(a.sphere, kind, name);
    assert.ok(a.orb?.parent === a.body, name);
    assert.ok(P.pulses(a), name);
    assert.ok(P.updateSpherePulse(a, dt, 0, false), name);
  }
  for (const [name, s] of [['floating eye', 'e'], ['yellow light', 'y'], ['fire elemental', 'E']]) assert.equal(P.updateSpherePulse(mon(name, s), dt, 0, false), null, name);
});

test('the heartbeat and surge envelopes stay in 0..1 and wrap smoothly', () => {
  for (let p = -1; p <= 2; p += .002) { const b = P.beatAt(p); assert.ok(b >= 0 && b <= 1, `${p}`); }
  assert.ok(Math.abs(P.beatAt(.9999) - P.beatAt(0)) < .01);
  assert.ok(P.beatAt(.06) > .99);
  for (let u = -.1; u <= 1.1; u += .005) { const s = P.surgeAt(u); assert.ok(s >= 0 && s <= 1, `${u}`); }
  assert.equal(P.surgeAt(0), 0); assert.equal(P.surgeAt(1), 0);
});

test('each core gets its own material so the beats are their own', () => {
  const a = mon('flaming sphere', 'e'), b = mon('flaming sphere', 'e');
  assert.equal(a.core.material, b.core.material);
  P.updateSpherePulse(a, dt, 0, false); P.updateSpherePulse(b, dt, 0, false);
  assert.notEqual(a.core.material, b.core.material);
});

test('the beat quickens near the hero', () => {
  const count = hero => {
    const a = mon('freezing sphere', 'e');
    let beats = 0, last = 0;
    for (let i = 0; i < 60 * 10; i++) { const st = P.updateSpherePulse(a, dt, i * dt, true, hero); if (st.beat < last) beats++; last = st.beat; }
    return beats;
  };
  const far = count(new THREE.Vector3(9, 0, 0)), near = count(new THREE.Vector3(1, 0, 0));
  assert.ok(far >= 5 && far <= 9, `far ${far}`);
  assert.ok(near >= 20, `near ${near}`);
});

test('each sphere throbs, surges, sheds particles, squashes, swells and rests after death', () => {
  for (const [name] of SPHERES) {
    const a = mon(name, 'e');
    const hero = new THREE.Vector3(2.5, 0, 1);
    const rest = pose(a);
    P.updateSpherePulse(a, 0, 0, false, hero);
    const st = a.spherePulse;
    let t = 0, surges = 0, was = false, seen = 0, big = 1, small = 1, squashY = 1, swell = 1, glowLo = Infinity, glowHi = -Infinity, step = 0, low = Infinity, high = -Infinity;
    let prev = pose(a);
    for (let i = 0; i < 60 * 30; i++) {
      t += dt;
      if (i === 60 * 20) a.actions = {current: {kind: 'hit'}};
      if (i === 60 * 20 + 10) a.actions = null;
      if (i >= 60 * 22 && i < 60 * 22 + 30) a.actions = {current: {kind: 'attack'}, age: 0, u: (i - 60 * 22) / 30};
      if (i === 60 * 22 + 30) a.actions = null;
      P.updateSpherePulse(a, dt, t, i % 600 > 540, hero);
      if (st.surge != null && !was) surges++;
      was = st.surge != null;
      assert.ok(finite(st.cloud), `${name} ${i}`);
      const now = pose(a);
      assert.ok(now.every(Number.isFinite), `${name} ${i}`);
      // the shock sphere jerks to new angles, so allow it a bigger step
      if (i !== 60 * 20) step = Math.max(step, ...now.map((v, k) => Math.abs(wrapD(v - prev[k]))));
      prev = now;
      seen = Math.max(seen, ...alphas(st.cloud));
      for (const m of st.motes) if (m.age < m.life) { low = Math.min(low, m.p.y); high = Math.max(high, m.p.y); assert.ok(Math.hypot(m.p.x, m.p.z) < 1.5, name); }
      const sx = a.orb.scale.x / rest[3], sy = a.orb.scale.y / rest[4];
      big = Math.max(big, sx); small = Math.min(small, sx);
      if (i > 60 * 20 && i < 60 * 20 + 20) squashY = Math.min(squashY, sy);
      if (i > 60 * 22 && i < 60 * 22 + 30) swell = Math.max(swell, sy);
      if (a.core) { glowLo = Math.min(glowLo, a.core.material.emissiveIntensity); glowHi = Math.max(glowHi, a.core.material.emissiveIntensity); }
    }
    assert.ok(surges >= 2, `${name} surges ${surges}`);
    assert.ok(seen > .3, `${name} particles ${seen}`);
    assert.ok(low >= 0 && high < 2, `${name} particle height ${low} ${high}`);
    assert.ok(big > 1.1 && big < 1.5 && small > .9, `${name} scale ${small} ${big}`);
    assert.ok(squashY < .95 && swell > 1.2, `${name} squash ${squashY} swell ${swell}`);
    assert.ok(step < (name.startsWith('shocking') ? .4 : .08), `${name} step ${step}`);
    if (a.core) assert.ok(glowLo >= .5 && glowHi > 7 && glowHi < 20, `${name} glow ${glowLo} ${glowHi}`);
    a.actions = {dead: true};
    for (let i = 0; i < 60 * 6; i++) { t += dt; P.updateSpherePulse(a, dt, t, false, hero); }
    const now = pose(a);
    rest.forEach((v, k) => assert.ok(Math.abs(now[k] - v) < 1e-6, `${name} ${k} ${now[k]} ${v}`));
    if (a.core) assert.ok(Math.abs(a.core.material.emissiveIntensity - P.CORE_BASE) < 1e-6, name);
    assert.ok(Math.max(...alphas(st.cloud)) === 0, `${name} particles left`);
  }
});

function wrapD(v) { return Math.atan2(Math.sin(v), Math.cos(v)); }
