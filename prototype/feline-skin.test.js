import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSkinnedFeline, updateSkinnedFeline, chainWeights, WALK} from './feline-skin.js';
import {createFeline} from './feline.js';

// feline-skin.js: the pet cat as one skinned mesh over a small skeleton (a trial of skinning).
test('chain weights blend softly across joints and always sum to one', () => {
  const j = [0, 1, 2];
  assert.deepEqual(chainWeights(.5, j, .1), [[0, 1]]);
  assert.deepEqual(chainWeights(1.5, j, .1), [[1, 1]]);
  const mid = chainWeights(1, j, .1); assert.equal(mid.length, 2); assert.ok(Math.abs(mid[0][1] - .5) < 1e-6 && Math.abs(mid[0][1] + mid[1][1] - 1) < 1e-9);
  const down = chainWeights(-.5, [0, -1, -2], .1); assert.deepEqual(down, [[0, 1]], 'a chain can run downward');
  assert.deepEqual(chainWeights(9, j, .1), [[1, 1]], 'past the end: the last bone');
});

test('the skinned cat is two skinned meshes over one skeleton, weighted, bound at rest, standing on the floor with the rigid cat\'s footprint', () => {
  for (const name of ['kitten', 'housecat', 'large cat']) {
    const a = createSkinnedFeline(name), rigid = createFeline(name);
    const skinned = []; a.g.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
    assert.equal(skinned.length, 2, name); assert.equal(skinned[0].skeleton, skinned[1].skeleton);
    assert.equal(skinned[0].skeleton.bones.length, 24, 'hips, spine, chest, neck, head, 5 tail, 3+4 per side');
    for (const m of skinned) {
      const w = m.geometry.attributes.skinWeight, idx = m.geometry.attributes.skinIndex;
      assert.ok(w && idx, 'skin attributes');
      for (let i = 0; i < w.count; i++) { const sum = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i); assert.ok(Math.abs(sum - 1) < 1e-4, `${name} vertex ${i} weights sum ${sum}`); for (const k of [idx.getX(i), idx.getY(i), idx.getZ(i), idx.getW(i)]) assert.ok(k >= 0 && k < 24); }
    }
    // at rest the skinned mesh sits where the rigid parts sit
    a.g.updateMatrixWorld(true); rigid.g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a.g, true), rb = new THREE.Box3().setFromObject(rigid.g, true);
    assert.ok(Math.abs(box.min.y - rb.min.y) < .02, `${name} on the floor ${box.min.y} vs ${rb.min.y}`);
    assert.ok(Math.abs(box.max.y - rb.max.y) < .05 && Math.abs(box.max.z - rb.max.z) < .05 && Math.abs(box.min.z - rb.min.z) < .05, `${name} footprint`);
    assert.ok(a.asset?.update && a.head?.isBone && a.legs.length === 0 && a.tail === null, 'drives itself through asset.update; the head bone takes the glance code');
    assert.deepEqual(a.fur.userData.color.length, 3, 'remembers its coat for the death burst');
  }
});

test('walking swings and bends the legs in diagonal pairs and bobs the hips; standing still settles back and the tail keeps moving', () => {
  const a = createSkinnedFeline('housecat'), r = a.rig;
  for (let i = 0; i < 60; i++) updateSkinnedFeline(a, 1 / 60, i / 60, true);
  const lf = r.legs.lfore.bones[0].rotation.x, rh = r.legs.rhind.bones[0].rotation.x, rf = r.legs.rfore.bones[0].rotation.x;
  assert.ok(Math.abs(lf) > .05, 'the legs swing'); assert.ok(Math.sign(lf) === Math.sign(rh) && Math.sign(lf) !== Math.sign(rf), 'diagonal pairs');
  assert.ok(Math.abs(r.spine.rotation.y) > 0 || Math.abs(r.chest.rotation.y) > 0, 'the spine undulates');
  let bent = false; for (let i = 0; i < 30; i++) { updateSkinnedFeline(a, 1 / 60, 1 + i / 60, true); if (Math.abs(r.legs.lfore.bones[1].rotation.x) > .1) bent = true; }
  assert.ok(bent, 'the elbow bends on the lift');
  for (let i = 0; i < 180; i++) updateSkinnedFeline(a, 1 / 60, 2 + i / 60, false);
  assert.ok(Math.abs(r.legs.lfore.bones[0].rotation.x) < .02 && Math.abs(r.hips.position.y - r.hips.userData.world[1]) < 1e-3, 'standing: the legs settle and the hips come down');
  const t1 = r.tail[3].rotation.y; updateSkinnedFeline(a, 1 / 60, 6, false); updateSkinnedFeline(a, 1 / 60, 6.4, false);
  assert.notEqual(t1, r.tail[3].rotation.y, 'the tail keeps swaying at rest');
  assert.ok(WALK.swing > .3 && WALK.swing < 1);
});

test('a turn leans the spine toward the new heading', () => {
  const a = createSkinnedFeline('kitten'), r = a.rig;
  for (let i = 0; i < 10; i++) updateSkinnedFeline(a, 1 / 60, i / 60, true);
  a.g.rotation.y += .4; for (let i = 0; i < 5; i++) updateSkinnedFeline(a, 1 / 60, 1 + i / 60, true);
  assert.ok(r.lean > .05, `leans ${r.lean}`);
  for (let i = 0; i < 120; i++) updateSkinnedFeline(a, 1 / 60, 2 + i / 60, true);
  assert.ok(Math.abs(r.lean) < .02, 'and straightens out');
});
