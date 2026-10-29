import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {lightAround, inCircle, CIRCLES, createDarkness, VEIL_ALPHA, HALO_ALPHA, LIGHT_EDGE, HALO_HALF} from './darkness.js';

// A frame with the hero at (10,5) and the given cells visible (offsets from the hero); everything
// else in a 15x9 block is remembered floor out of sight.
function frame(visibleOffsets, player = {}) {
  const on = new Set(visibleOffsets.map(([dx, dz]) => `${dx},${dz}`)), cells = [];
  for (let dz = -4; dz <= 4; dz++) for (let dx = -7; dx <= 7; dx++)
    cells.push({x: 10 + dx, z: 5 + dz, terrain: 'floor', visible: on.has(`${dx},${dz}`), remembered: true, kind: 'terrain'});
  return {player: {x: 10, z: 5, conditions: [], ...player}, cells};
}
const disc = r => { const out = []; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (inCircle(dx, dz, r)) out.push([dx, dz]); return out; };
const all = () => { const out = []; for (let dz = -4; dz <= 4; dz++) for (let dx = -7; dx <= 7; dx++) out.push([dx, dz]); return out; };

test('the vision circles are NetHack\'s own (vision.c circle_data)', () => {
  assert.deepEqual(CIRCLES, {1: [1, 1], 2: [2, 2, 1], 3: [3, 3, 2, 1]});
  assert.ok(inCircle(1, 1, 1) && !inCircle(2, 0, 1));
  assert.ok(inCircle(3, 1, 3) && inCircle(2, 2, 3) && !inCircle(3, 2, 3) && !inCircle(2, 3, 3) && inCircle(1, 3, 3));
  assert.ok(inCircle(2, 1, 2) && !inCircle(2, 2, 2));
});

test('only the eight neighbours in sight: dark, with no light of the hero\'s own', () => {
  assert.deepEqual(lightAround(frame(disc(1))), {dark: true, radius: 1, carried: false});
});

test('a lamp\'s radius-3 disc in sight: dark, and the hero carries light that reaches 3', () => {
  assert.deepEqual(lightAround(frame(disc(3))), {dark: true, radius: 3, carried: true});
  assert.deepEqual(lightAround(frame(disc(2))), {dark: true, radius: 2, carried: true}, 'a candle reaches 2');
});

test('anything seen past radius 3 is a lit place: the dark treatment stays off', () => {
  assert.equal(lightAround(frame(all())).dark, false, 'a lit room');
  assert.equal(lightAround(frame([...disc(1), [6, 0]])).dark, false, 'a lit spot in view across the room');
  assert.equal(lightAround(frame([...disc(3), [3, 2]])).dark, false, 'just outside the lamp circle');
});

test('blind, engulfed, or no frame: off', () => {
  assert.equal(lightAround(frame(disc(1), {conditions: ['Blind']})).dark, false);
  assert.equal(lightAround({...frame(disc(1)), engulfer: {name: 'fog cloud'}}).dark, false);
  assert.equal(lightAround(null).dark, false);
  assert.equal(lightAround(frame([])).dark, false, 'nothing in sight at all is not read as darkness');
});

const camera = () => { const c = new THREE.PerspectiveCamera(36, 1.6, .1, 100); c.position.set(9, 10.7, 13.1); c.lookAt(0, 0, 0); c.updateMatrixWorld(); return c; };
const lights = root => { let n = 0; root.traverse(o => { if (o.isLight) n++; }); return n; };
const run = (d, secs, opts) => { for (let t = 0; t < secs; t += 1 / 30) d.update(t, 1 / 30, opts); };

test('the veil and halo come on only from the frame that justifies them, and go when it does', () => {
  const scene = new THREE.Scene(), d = createDarkness(THREE, scene), opts = {at: new THREE.Vector3(), camera: camera()};
  run(d, 1, opts);
  assert.ok(!d.veil.visible && !d.halo.visible, 'nothing before a frame says dark');
  d.frame(frame(all())); run(d, 2, opts);
  assert.ok(!d.veil.visible && !d.halo.visible, 'a lit room: nothing');
  d.frame(frame(disc(1))); run(d, 3, opts);
  assert.ok(d.veil.visible, 'dark: the veil is up');
  assert.ok(Math.abs(d.veil.material.uniforms.alpha.value - VEIL_ALPHA) < .01);
  assert.ok(!d.halo.visible, 'no light of her own: no halo');
  d.frame(frame(disc(3))); run(d, 3, {...opts, moving: true});
  assert.ok(d.halo.visible && Math.abs(d.halo.material.uniforms.alpha.value - HALO_ALPHA) < .01, 'a lamp lit: the halo shows');
  const r = d.halo.material.uniforms.radius.value * HALO_HALF;
  assert.ok(Math.abs(r - (3 + LIGHT_EDGE)) < .1, `the ring sits at the light's edge (${r.toFixed(2)})`);
  d.frame(frame(all())); run(d, 2, opts);
  assert.ok(!d.veil.visible && !d.halo.visible, 'into a lit room: both go');
  d.frame(frame(disc(1))); run(d, 2, opts); d.clear();
  assert.ok(!d.veil.visible && !d.halo.visible && !d.state.dark, 'clear() (a new level) turns it off at once');
});

test('the halo sways with the hero\'s steps and holds still-ish when she stands', () => {
  const d = createDarkness(THREE, new THREE.Scene()), opts = {at: new THREE.Vector3(2, 0, 3), camera: camera()};
  d.frame(frame(disc(3)));
  const xs = [];
  for (let t = 0; t < 2; t += 1 / 30) { d.update(t, 1 / 30, {...opts, moving: true}); xs.push(d.halo.position.x); }
  const swing = Math.max(...xs) - Math.min(...xs);
  assert.ok(swing > .08 && swing < .2, `walking swings it (${swing.toFixed(3)})`);
  const still = [];
  for (let t = 2; t < 4; t += 1 / 30) { d.update(t, 1 / 30, opts); still.push(d.halo.position.x); }
  assert.ok(Math.max(...still) - Math.min(...still) < swing / 2, 'standing, it barely drifts');
  assert.ok(Math.abs(d.halo.position.z - 3) < .1 && d.halo.position.y > 0 && d.halo.position.y < .05, 'on the floor at the hero');
});

test('the hole in the veil is centred on the hero as the camera sees her', () => {
  const cam = camera(), d = createDarkness(THREE, new THREE.Scene()), at = new THREE.Vector3(1, 0, -2);
  d.frame(frame(disc(1))); run(d, 2, {at, camera: cam});
  const p = new THREE.Vector3(at.x, .3, at.z).project(cam), c = d.veil.material.uniforms.center.value;
  assert.ok(Math.abs(c.x - (p.x + 1) / 2) < 1e-6 && Math.abs(c.y - (p.y + 1) / 2) < 1e-6);
  const rr = d.veil.material.uniforms.radii.value;
  assert.ok(rr.x > 0 && rr.y > 0 && rr.y <= rr.x * 1.01, 'an ellipse, flattened by the camera\'s tilt');
});

test('adds no lights, two meshes in all, and costs nothing per cell', () => {
  const scene = new THREE.Scene(), before = lights(scene);
  const d = createDarkness(THREE, scene);
  assert.equal(lights(scene), before, 'no lights');
  let meshes = 0; scene.traverse(o => { if (o.isMesh) meshes++; });
  assert.equal(meshes, 2, 'the veil and the halo');
  const src = readFileSync(new URL('./darkness.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /Light\(/, 'no light is ever made');
  d.dispose(); assert.equal(scene.children.length, 0);
});

test('live.js keeps its tuned lighting constants and wires the dark in', () => {
  const src = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.match(src, /TORCH_INTENSITY=15,LIVE_AMBIENT=\.68,/);
  assert.match(src, /const lantern=new THREE\.PointLight\(0xffd49c,22,11,2\)/);
  assert.match(src, /darkness\.frame\(frame\)/);
  assert.match(src, /darkness\.update\(t,dt,\{at:hero\.g\.position,camera,moving\}\)/);
  assert.match(src, /darkEyes\.mark\(a,cell\)/);
  assert.match(src, /darkEyes\.drop\(a\);/, 'eyes come off before a monster is ghosted or released');
  assert.match(src, /clear\(\);darkness\.clear\(\);darkEyes\.clear\(\);/, 'and a new level starts clean');
});
