import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createHeroBatch, HIDDEN_LAYER} from './hero-batch.js';
import {addOutlines} from './readability.js';

const drawn = o => o.layers.test(new THREE.Layers());
function rig() {
  const g = new THREE.Group(), arm = new THREE.Group(), socket = new THREE.Group();g.add(arm);arm.add(socket);
  const steel = new THREE.MeshStandardMaterial(), cloth = new THREE.MeshStandardMaterial();
  const piece = (mat, parent, x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), mat);m.position.x = x;parent.add(m);return m; };
  const a = piece(steel, arm, 0), b = piece(steel, arm, .2), c = piece(steel, arm, .4), d = piece(cloth, arm, .6), sword = piece(steel, socket, 0), sword2 = piece(steel, socket, .1);
  addOutlines(g);
  return {g, arm, socket, steel, cloth, a, b, c, d, sword, sword2};
}

test('siblings sharing a material draw as one stand-in; the pieces stay put, hidden from every camera', () => {
  const r = rig(), batch = createHeroBatch(r.g, {exclude: o => o === r.socket, outline: m => addOutlines(m)});
  assert.equal(batch.sync(), true);
  assert.equal(batch.proxies.length, 1);
  const [proxy] = batch.proxies;
  assert.equal(proxy.parent, r.arm);assert.equal(proxy.material, r.steel, 'the same material object: a kit recolouring it recolours the stand-in');
  assert.equal(proxy.geometry.attributes.position.count, 3 * 24);
  for (const o of [r.a, r.b, r.c]) { assert.ok(!drawn(o) && o.layers.isEnabled(HIDDEN_LAYER));assert.ok(o.children.every(h => !drawn(h)), 'its ink hull too');assert.equal(o.visible, true); }
  assert.ok(drawn(r.d), 'a lone material draws itself');
  assert.ok(drawn(r.sword) && drawn(r.sword2), 'an excluded subtree (a held weapon) is left alone');
  assert.ok(proxy.children.some(h => h.userData.outline), 'the stand-in has its own ink hull');
  assert.equal(batch.sync(), false, 'nothing changed, nothing rebuilt');
});

test('hiding a piece, as the helm toggle or a kit does, rebuilds the stand-in without it', () => {
  const r = rig(), batch = createHeroBatch(r.g, {exclude: o => o === r.socket});
  batch.sync();r.c.visible = false;
  assert.equal(batch.sync(), true);
  assert.equal(batch.proxies[0].geometry.attributes.position.count, 2 * 24);
  r.c.visible = true;batch.sync();
  assert.equal(batch.proxies[0].geometry.attributes.position.count, 3 * 24, 'shown again, back in');
});

test('a piece that turns see-through (the death fade, invisibility) leaves the batch and draws itself', () => {
  const r = rig(), batch = createHeroBatch(r.g, {exclude: o => o === r.socket});
  batch.sync();
  for (const o of [r.a, r.b, r.c]) { o.material = o.material.clone();o.material.transparent = true;o.material.opacity = .5; }
  batch.sync();
  assert.equal(batch.proxies.length, 0);
  for (const o of [r.a, r.b, r.c]) assert.ok(drawn(o) && o.children.every(drawn), 'back on the drawn layer with its hull');
  for (const o of [r.a, r.b, r.c]) o.material = r.steel;
  batch.sync();assert.equal(batch.proxies.length, 1, 'restored, batched again');
});

test('a piece that moves on its own (a swaying hem) drops out of the batch for good', () => {
  const r = rig(), batch = createHeroBatch(r.g, {exclude: o => o === r.socket});
  batch.sync();r.c.rotation.z = .3;
  assert.equal(batch.sync(), true);
  assert.ok(drawn(r.c));assert.equal(batch.proxies[0].geometry.attributes.position.count, 2 * 24);
  r.c.rotation.z = 0;batch.sync();assert.ok(drawn(r.c), 'it stays out');
  r.arm.rotation.x = 1;assert.equal(batch.sync(), false, 'the parent moving carries the stand-in along: nothing to rebuild');
});

test('dispose puts every piece back on the drawn layer', () => {
  const r = rig(), batch = createHeroBatch(r.g, {exclude: o => o === r.socket});
  batch.sync();batch.dispose();
  assert.equal(r.arm.children.filter(o => o.name === 'hero batch').length, 0);
  for (const o of [r.a, r.b, r.c]) assert.ok(drawn(o));
});

test('live.js batches the hero each frame, leaving held weapons, auras and a polymorph shape out', () => {
  const live = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.match(live, /const heroBatch=createHeroBatch\(hero\.g,\{exclude:o=>o===hero\.weaponSocket\|\|o===hero\.offhandSocket\|\|o===hero\.g\.userData\.heldWand\|\|o===heroForm\.shape,outline:m=>addOutlines\(m\)\}\)/);
  assert.match(live, /heroBatch\.sync\(\);\n/);
});
