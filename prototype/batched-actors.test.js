import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createActorBatch, HIDDEN_LAYER} from './batched-actors.js';
import {createCreature, bakeDraws} from './creatures.js';
import {applyFade, restoreFade} from './deaths.js';

// batched-actors.js: every baked part of every staged monster draws from one BatchedMesh.
const stage = (root, name, x) => { const a = bakeDraws(createCreature({name, symbol: name.charCodeAt(0), color: 2})); a.g.position.set(x, 0, 0); root.add(a.g); return a; };
const count = a => { let n = 0; a.g.traverse(o => { if (o.isMesh && o.material.isBakedMaterial && o.castShadow) n++; }); return n; };

test('a hall of leprechauns is one batch: parts leave the camera layer and follow their rig', () => {
  const root = new THREE.Group(), batch = createActorBatch(root);
  const leps = [0, 1, 2, 3].map(i => stage(root, 'leprechaun', i * 2));
  const taken = leps.map(a => batch.add(a));
  assert.ok(taken[0] >= 5 && taken.every(n => n === taken[0]), `took ${taken[0]} parts each`);
  assert.equal(batch.batches, 1, 'one material, one batched mesh');
  assert.equal(batch.size, taken[0] * 4);
  for (const a of leps) a.g.traverse(o => { if (o.isMesh && o.material.isBakedMaterial) assert.ok(!o.layers.test(new THREE.Layers()), 'proxy hidden from the default layer'); });
  // the rig moves; the instance follows
  leps[2].body.rotation.y = 1; leps[2].g.position.x = 9;
  root.updateMatrixWorld(true); batch.update(); batch.sync(1); batch.sync(1);
  const mesh = batch.meshes()[0], got = new THREE.Matrix4();
  let proxy = null; leps[2].body.traverse(o => { if (!proxy && o.isMesh && o.material.isBakedMaterial) proxy = o; });
  const e = [...Array(mesh.instanceCount).keys()];
  let matched = false;
  const close = (a, b) => a.elements.every((v, i) => Math.abs(v - b.elements[i]) < 1e-5);
  for (const id of e) { try { mesh.getMatrixAt(id, got); } catch { continue; } if (close(got, proxy.matrixWorld)) matched = true; }
  assert.ok(matched, 'an instance carries the moved part\'s world matrix');
});

test('a faded creature draws itself until its materials come back, a hidden one is culled, a released one drops out', () => {
  const root = new THREE.Group(), batch = createActorBatch(root);
  const a = stage(root, 'jackal', 0), b = stage(root, 'gnome', 2), c = stage(root, 'soldier', 4);
  batch.add(a); batch.add(b); batch.add(c);
  const total = batch.size;
  root.updateMatrixWorld(true); batch.update();
  assert.equal(batch.drawn(), total);
  applyFade(a, .5); batch.update();
  assert.equal(batch.drawn(), total - count(a), 'the fading jackal left the batch');
  a.g.traverse(o => { if (o.isMesh && o.material.transparent) assert.ok(o.layers.test(new THREE.Layers()), 'and draws itself'); });
  restoreFade(a); batch.update();
  assert.equal(batch.drawn(), total, 'and is back once restored');
  b.g.visible = false; batch.update();
  let hidden = 0; for (const mesh of batch.meshes()) for (let id = 0; id < mesh.maxInstanceCount; id++) { try { if (!mesh.getVisibleAt(id)) hidden++; } catch {} }
  assert.ok(hidden >= count(b), 'the hidden gnome\'s instances are culled');
  root.remove(c.g); batch.update();
  assert.equal(batch.size, total - count(c), 'the released soldier dropped out');
  batch.clear();
  assert.equal(batch.size, 0);
});

test('the batch grows past its starting room instead of throwing', () => {
  const root = new THREE.Group(), batch = createActorBatch(root, {start: {instances: 4, vertices: 2000, indices: 6000}});
  for (let i = 0; i < 6; i++) batch.add(stage(root, 'leprechaun', i));
  assert.ok(batch.size > 4);
  const mesh = batch.meshes()[0];
  assert.ok(mesh.maxInstanceCount >= batch.size && mesh.geometry.attributes.position.count > 2000);
});

test('a part whose vertices an animation rewrites leaves the batch for good', () => {
  const root = new THREE.Group(), batch = createActorBatch(root);
  const a = stage(root, 'gnome', 0); batch.add(a);
  const n = batch.size; assert.ok(n > 0);
  let part = null; a.g.traverse(o => { if (!part && o.isMesh && o.material.isBakedMaterial) part = o; });
  part.geometry.attributes.position.needsUpdate = true;
  root.updateMatrixWorld(true); batch.update();
  assert.equal(batch.size, n - 1); assert.ok(part.userData.unbatched && part.layers.test(new THREE.Layers()));
  batch.add(a); assert.equal(batch.size, n - 1, 'not taken again');
});

test('plain early-game models (vertex-coloured bodies, labelled parts) are converted in place and batched whole', () => {
  const root = new THREE.Group(), batch = createActorBatch(root);
  for (const name of ['jackal', 'newt', 'sewer rat', 'gnome', 'soldier']) {
    const a = stage(root, name, 0), parts = [];
    a.g.traverse(o => { if (o.isMesh && o.castShadow && o.receiveShadow && !o.userData.ring) parts.push(o); });
    const plain = parts.filter(o => o.material.isBakedMaterial);
    assert.ok(plain.length >= parts.length - 2, `${name}: ${plain.length} of ${parts.length} parts baked`);
    assert.ok(plain.every(o => o.geometry.attributes.rm && o.geometry.attributes.color), name);
    batch.add(a);
  }
  assert.ok(batch.batches <= 4, `a batched mesh per shading variant (smooth or flat, one- or two-sided): ${batch.batches}`);
});
