import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';

// A stand-in canvas for the glint and shadow textures.
globalThis.document ??= {createElement: () => ({width: 0, height: 0, getContext: () => ({createRadialGradient: () => ({addColorStop() {}}), fillRect() {}, set fillStyle(v) {}})})};
const {createDarkEyes, inDark, EYES_MAX, SHADOW_FIRST, SHADOW_KEEP, SETTLE, VEILED} = await import('./dark-eyes.js');

// A monster with a body and a head, the way the creature builders hand them over.
function monster() {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({color: 0x886644});
  const body = new THREE.Mesh(new THREE.BoxGeometry(.4, .6, .3), mat); body.position.y = .3; g.add(body);
  const head = new THREE.Group(); head.position.set(0, .72, .05); g.add(head);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), mat));
  return {g, head, mat};
}
const cell = (o = {}) => ({x: 3, z: 4, kind: 'monster', visible: false, remembered: true, invisible: false, ...o});
const step = (eyes, actors, secs, opts) => { let t = 0; for (; t < secs; t += 1 / 30) eyes.update(actors, 1 / 30, t, opts); };
const materials = root => { const s = new Set(); root.traverse(o => { if (o.isMesh) s.add(o.material); }); return s; };

test('in the dark means perceived on a square the hero cannot see, never the unseen-monster marker', () => {
  assert.equal(inDark(cell()), true);
  assert.equal(inDark(cell({kind: 'pet'})), true);
  assert.equal(inDark(cell({visible: true})), false, 'in sight: drawn as always');
  assert.equal(inDark(cell({invisible: true})), false, 'the marker stays the marker');
  assert.equal(inDark(cell({kind: 'object'})), false);
  assert.equal(inDark(null), false);
});

test('eyes come on only for a monster in the dark, sit at its head, and go when its square is seen', () => {
  const eyes = createDarkEyes(THREE), a = monster(), mats = materials(a.g);
  eyes.mark(a, cell({visible: true})); step(eyes, [a], 1);
  assert.equal(a.darkEyes ?? null, null, 'seen in the light: nothing');
  eyes.mark(a, cell()); step(eyes, [a], 1);
  assert.ok(a.darkEyes, 'in the dark: eyes');
  const [l, r] = a.darkEyes.eyes;
  assert.ok(l.position.y > .7 && l.position.y < .85 && l.position.z > .14, `at the front of the head (${l.position.y.toFixed(2)}, ${l.position.z.toFixed(2)})`);
  assert.ok(l.position.x < 0 && r.position.x > 0, 'a pair');
  assert.ok(l.scale.x > 0, 'grown in');
  assert.deepEqual(materials(a.g), mats, 'the monster\'s own materials are never swapped');
  eyes.mark(a, cell({visible: true})); step(eyes, [a], 1.5);
  assert.equal(a.darkEyes, null, 'seen again: gone');
  assert.equal(a.g.children.length, 2, 'nothing left on the monster');
  assert.equal(eyes.count, 0);
});

test('the shadow is thick at first, then thins so the shape shows; thinner under the veil', () => {
  const eyes = createDarkEyes(THREE), a = monster();
  eyes.mark(a, cell()); step(eyes, [a], .8);
  const early = a.darkEyes.shadow.material.opacity;
  step(eyes, [a], SETTLE + 1);
  const late = a.darkEyes.shadow.material.opacity;
  assert.ok(early > late, `thins (${early.toFixed(2)} to ${late.toFixed(2)})`);
  assert.ok(Math.abs(late - SHADOW_KEEP) < .03 && early <= SHADOW_FIRST, 'settles where the shape still reads');
  step(eyes, [a], .2, {veiled: true});
  assert.ok(Math.abs(a.darkEyes.shadow.material.opacity - SHADOW_KEEP * VEILED) < .03, 'the veil already darkens it');
  assert.ok(a.darkEyes.eyes[0].scale.x > 0, 'but the eyes still glint');
});

test('a hidden, dead or released monster carries no eyes', () => {
  const eyes = createDarkEyes(THREE), a = monster(), b = monster(), c = monster();
  eyes.mark(a, cell()); a.g.visible = false;
  eyes.mark(b, cell()); b.actions = {dead: true};
  eyes.mark(c, cell());
  step(eyes, [a, b, c], 1);
  assert.equal(a.darkEyes ?? null, null); assert.equal(b.darkEyes ?? null, null);
  assert.ok(c.darkEyes);
  step(eyes, [a, b], .1);
  assert.equal(c.darkEyes, null, 'gone from the level: dropped');
});

test('capped at EYES_MAX, no lights, shared glint materials', () => {
  const eyes = createDarkEyes(THREE), scene = new THREE.Scene(), crowd = Array.from({length: EYES_MAX + 6}, () => { const m = monster(); scene.add(m.g); eyes.mark(m, cell()); return m; });
  step(eyes, crowd, 1);
  assert.equal(eyes.count, EYES_MAX);
  let lights = 0; const glintMats = new Set();
  scene.traverse(o => { if (o.isLight) lights++; if (o.isSprite && o.material.blending === THREE.AdditiveBlending) glintMats.add(o.material); });
  assert.equal(lights, 0);
  assert.equal(glintMats.size, 1, 'every hostile glint shares one material');
  eyes.clear(); assert.equal(eyes.count, 0);
  assert.doesNotMatch(readFileSync(new URL('./dark-eyes.js', import.meta.url), 'utf8'), /Light\(/);
});

test('pets and peaceful monsters glint calm, hostile ones amber', () => {
  const eyes = createDarkEyes(THREE), pet = monster(), foe = monster();
  eyes.mark(pet, cell({kind: 'pet'})); eyes.mark(foe, cell());
  step(eyes, [pet, foe], .5);
  assert.equal(pet.darkEyes.eyes[0].material, eyes.glints.calm);
  assert.equal(foe.darkEyes.eyes[0].material, eyes.glints.hostile);
});
