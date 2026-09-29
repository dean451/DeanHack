import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLightItem} from './shop-visuals.js';
import {createCandelabrum} from './candelabrum.js';
import {createWatch} from './watch.js';
import {createFlameFlicker, flameState, flameLightPosition, FLAME_SCAN_EVERY, FLAME_LIGHTS, FLAME_LIGHT_INTENSITY, FLAME_LIGHT_LANTERN} from './flame-flicker.js';
import {createThrone} from './throne.js';
import {createThroneGleam, gleamState, glint, GLEAM_BREATHE, GLEAM_SMOULDER, GLEAM_GLINT, GLEAM_SAPPHIRE_EVERY, GLEAM_RUBY_EVERY} from './throne-gleam.js';

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

test('a fixed pool of warm lights follows the flames nearest the focus, flickers, fades and never grows', () => {
  const scene = new THREE.Scene(), focus = new THREE.Vector3();
  const items = ['a brass lantern (lit)', 'a wax candle (lit)', 'a wax candle (lit)', 'a wax candle (lit)', 'a wax candle (lit)'].map(createLightItem);
  items.forEach((g, i) => {g.position.set(i * 2, 0, 0);scene.add(g);});
  const flicker = createFlameFlicker(scene, {focus: () => focus});
  const lights = flicker.lights, count = () => { let n = 0;scene.traverse(o => { if (o.isLight) n++; });return n; };
  assert.equal(lights.length, FLAME_LIGHTS);assert.equal(count(), FLAME_LIGHTS);
  assert(lights.every(l => !l.castShadow && l.intensity === 0));
  flicker.update(0);
  const byItem = f => items.findIndex(g => { let hit = false;g.traverse(o => { if (o === f) hit = true; });return hit; });
  const lit = () => lights.filter(l => l.userData.flame && l.intensity > 0).map(l => byItem(l.userData.flame)).sort();
  let peak = 0, low = Infinity;
  for (let t = 0; t <= 3; t += 1 / 60) {
    flicker.update(t);
    for (const l of lights) {
      for (const v of [...l.position.toArray(), l.intensity]) assert(Number.isFinite(v));
      assert(l.intensity >= 0 && l.intensity < FLAME_LIGHT_INTENSITY * FLAME_LIGHT_LANTERN * 1.3);
      if (l.userData.flame) {
        assert(l.position.distanceTo(flameLightPosition(l.userData.flame)) < 1e-9, 'light sits on its flame');
        if (t > 1) { peak = Math.max(peak, l.intensity);low = Math.min(low, l.intensity); }
      }
    }
  }
  assert.deepEqual(lit(), [0, 1, 2], 'the three nearest flames are lit');
  assert(peak - low > 1, 'the lights flicker');
  const lanternLight = lights.find(l => byItem(l.userData.flame) === 0);
  assert(lanternLight.userData.strength > lights.find(l => byItem(l.userData.flame) === 1).userData.strength, 'a lantern outshines a candle');
  // Moving the focus hands a light to the far candles; the old ones fade instead of snapping off.
  focus.set(8, 0, 0);flicker.update(3 + 1 / 60);
  assert(lanternLight.intensity > 0, 'fading, not snapped off');
  for (let t = 3 + 2 / 60; t <= 5; t += 1 / 60) flicker.update(t);
  assert.deepEqual(lit(), [2, 3, 4]);
  assert.equal(count(), FLAME_LIGHTS, 'the pool never grows');
  // Hidden flames (Live mode's group hidden in the demo room) aren't lit.
  items.forEach(g => { g.visible = false; });
  for (let t = 5; t <= 6; t += 1 / 60) flicker.update(t);
  assert(lights.every(l => l.intensity === 0 && !l.userData.flame));
  // No focus: the lights stay off. restore() turns them off; dispose() removes them.
  items.forEach(g => { g.visible = true; });
  const plain = createFlameFlicker(new THREE.Scene().add(...items));
  for (let t = 0; t < 1; t += 1 / 30) plain.update(t);
  assert(plain.lights.every(l => l.intensity === 0));
  flicker.restore();assert(lights.every(l => l.intensity === 0));
  flicker.dispose();assert.equal(count(), 0);
});

// Throne jewels (throne-gleam.js) are tested here too, beside the other glowing ambience.

test('gleamState stays finite and bounded, and each stone glints about once per slot', () => {
  let sapphireGlints = 0, rubyGlints = 0, wasS = false, wasR = false;
  for (let t = 0; t < 140; t += 1 / 60) {
    const c = gleamState(t, 1.7);
    for (const v of Object.values(c)) assert(Number.isFinite(v));
    assert(c.sapphire >= 1 - GLEAM_BREATHE - 1e-9 && c.sapphire <= 1 + GLEAM_BREATHE + GLEAM_GLINT + 1e-9, `sapphire ${c.sapphire}`);
    assert(c.ruby >= 1 - GLEAM_SMOULDER - 1e-9 && c.ruby <= 1 + GLEAM_SMOULDER + GLEAM_GLINT + 1e-9, `ruby ${c.ruby}`);
    const s = c.sapphireGlint > .5, r = c.rubyGlint > .5;
    if (s && !wasS) sapphireGlints++;
    if (r && !wasR) rubyGlints++;
    wasS = s;wasR = r;
  }
  assert(Math.abs(sapphireGlints - 140 / GLEAM_SAPPHIRE_EVERY) <= 1, `sapphire glints ${sapphireGlints}`);
  assert(Math.abs(rubyGlints - 140 / GLEAM_RUBY_EVERY) <= 1, `ruby glints ${rubyGlints}`);
  // A glint is continuous across slot boundaries: it's ~0 there.
  for (let k = 1; k < 20; k++) assert(glint(k * GLEAM_SAPPHIRE_EVERY - 1e-6, GLEAM_SAPPHIRE_EVERY) < 1e-6);
});

test('throne jewels breathe and glint smoothly, out of step between thrones, and restore exactly', () => {
  const scene = new THREE.Scene(), thrones = [createThrone(), createThrone()];
  thrones.forEach((th, i) => { th.position.x = i * 2;scene.add(th); });
  const stones = thrones.map(th => th.children.filter(c => ['jewel', 'ruby'].includes(c.userData.part)));
  const rest = stones.map(list => list.map(m => m.material.emissiveIntensity));
  assert(stones.every(list => list.length === 2));
  const gleam = createThroneGleam(scene);
  let maxStep = 0, differ = 0, prev = null;
  for (let t = 0; t < 30; t += 1 / 60) {
    gleam.update(t);
    const now = stones.map((list, i) => list.map((m, j) => m.material.emissiveIntensity / rest[i][j]));
    for (const v of now.flat()) assert(Number.isFinite(v) && v > .5 && v < 2);
    if (prev) for (let i = 0; i < now.flat().length; i++) maxStep = Math.max(maxStep, Math.abs(now.flat()[i] - prev.flat()[i]));
    if (Math.abs(now[0][0] - now[1][0]) > .02) differ++;
    prev = now;
  }
  assert.equal(gleam.thrones.length, 2);
  assert(maxStep < .15, `no glow jump bigger than ${maxStep} a frame`);
  assert(differ > 100, 'two thrones do not pulse in step');
  scene.remove(thrones[1]);gleam.update(31);
  assert.deepEqual(stones[1].map(m => m.material.emissiveIntensity), rest[1], 'a throne that leaves the scene gets its glow back');
  gleam.restore();
  assert.deepEqual(stones.map(list => list.map(m => m.material.emissiveIntensity)), rest);
  for (const th of thrones) th.userData.dispose();
});
