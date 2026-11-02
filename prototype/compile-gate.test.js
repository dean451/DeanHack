import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {holdUncompiled, releaseHeld, WAIT_LAYER} from './compile-gate.js';
import {addOutlines} from './readability.js';
import {liveSource} from './live-source.js';

const drawn = o => o.layers.test(new THREE.Layers());
const box = m => new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), m);

test('only meshes with materials not yet compiled wait, hulls with them, and the hero is left alone', () => {
  const root = new THREE.Group(), hero = new THREE.Group(), old = new THREE.MeshStandardMaterial(), fresh = new THREE.MeshStandardMaterial();
  const a = box(old), b = box(fresh), h = box(new THREE.MeshStandardMaterial());root.add(a, b, hero);hero.add(h);addOutlines(root);
  const compiled = new WeakSet([old]);
  const held = holdUncompiled(root, compiled, o => o === hero);
  assert.deepEqual(held.meshes, [b]);
  assert.ok(drawn(a) && drawn(h), 'compiled, or the hero: drawn');
  assert.ok(!drawn(b) && b.layers.isEnabled(WAIT_LAYER) && b.children.every(c => !drawn(c)), 'new: waits off-camera with its outline');
  releaseHeld(held, compiled);
  assert.ok(drawn(b) && b.children.every(drawn), 'compiled: it joins the scene');
  assert.ok(compiled.has(fresh), 'its material counts as compiled from now on');
  assert.equal(holdUncompiled(root, compiled, o => o === hero).meshes.length, 0, 'a second look holds nothing');
});

test('a material that turned up after the compile started is not marked compiled by it', () => {
  const root = new THREE.Group(), first = new THREE.MeshStandardMaterial(), later = new THREE.MeshStandardMaterial(), compiled = new WeakSet();
  root.add(box(first));
  const held = holdUncompiled(root, compiled);
  root.add(box(later));
  releaseHeld(held, compiled);releaseHeld(held, compiled);
  assert.ok(compiled.has(first) && !compiled.has(later));
});

test('live.js holds the uncompiled things back while its warm-up compile runs, and lets them go when it ends', () => {
  const live = liveSource();
  assert.match(live, /const held=holdUncompiled\(group,compiledMaterials,o=>o===hero\.g\),done=\(\)=>releaseHeld\(held,compiledMaterials\);compileFor\(renderer,warmTarget,\(\)=>renderer\.compileAsync\(scene,camera\)\)\.then\(done,done\);setTimeout\(done,MAX_WAIT_MS\);/);
});
