import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {rigFox, FOX} from './fox-skin.js';
import {attachModelAsset} from './model-assets.js';
import {createCreature} from './creatures.js';

// The shipped fox, read straight from the GLB (positions only: node has no image decoder).
function readFox() {
  const buf = readFileSync(new URL('./models/fox.glb', import.meta.url)); let json, bin, o = 12;
  while (o < buf.length) { const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4), d = buf.subarray(o + 8, o + 8 + len); if (type === 0x4E4F534A) json = JSON.parse(d.toString()); else bin = d; o += 8 + len; }
  const a = json.accessors[json.meshes[0].primitives[0].attributes.POSITION], v = json.bufferViews[a.bufferView];
  const pos = new Float32Array(bin.buffer.slice(bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0), bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0) + a.count * 12));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const scene = new THREE.Group(); scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial()));
  return {json, scene};
}

test('the shipped fox is the bare CC0 body: no skin, no joints, no clips', () => {
  const {json} = readFox();
  assert.ok(!json.skins && !json.animations, 'the credited rig and clips are gone');
  assert.equal(json.nodes.length, 1);
  assert.deepEqual(Object.keys(json.meshes[0].primitives[0].attributes).sort(), ['POSITION', 'TEXCOORD_0']);
  assert.equal(json.images.length, 1, 'the texture stays');
});

test('our rig: the cat\'s 24 bones under the cat\'s names, every vertex weighted, paws on the legs, the brush on the tail, the muzzle on the head', () => {
  const {scene} = readFox(), r = rigFox(scene);
  assert.ok(r && r.skinned.isSkinnedMesh);
  assert.equal(r.bones.length, 24);
  for (const name of ['hips', 'spine', 'chest', 'neck', 'head', 'tail0', 'tail4', 'lfore0', 'rfore2', 'lhind0', 'rhind3']) assert.ok(r.bones.some(b => b.name === name), name);
  const g = r.skinned.geometry, w = g.attributes.skinWeight, idx = g.attributes.skinIndex, pos = g.attributes.position, S = FOX.scale;
  const top = i => { let best = 0, bw = -1; for (let k = 0; k < 4; k++) if (w.getComponent(i, k) > bw) { bw = w.getComponent(i, k); best = idx.getComponent(i, k); } return r.bones[best].name; };
  let paws = 0, pawsOnLegs = 0, tip = 0, tipOnTail = 0, nose = 0, noseOnHead = 0;
  for (let i = 0; i < pos.count; i++) {
    assert.ok(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-4, `vertex ${i} weights sum to one`);
    const y = pos.getY(i) / S, z = pos.getZ(i) / S, b = top(i);
    if (y < 4) { paws++; if (/fore|hind/.test(b)) pawsOnLegs++; }
    if (z < -80) { tip++; if (/tail[34]/.test(b)) tipOnTail++; }
    if (z > 56) { nose++; if (b === 'head') noseOnHead++; }
  }
  assert.ok(paws > 50 && pawsOnLegs === paws, `paws on legs ${pawsOnLegs}/${paws}`);
  assert.ok(tip > 10 && tipOnTail === tip, `tail tip on the tail ${tipOnTail}/${tip}`);
  assert.ok(nose > 10 && noseOnHead === nose, `muzzle on the head ${noseOnHead}/${nose}`);
  // the body stands on the floor at the cat's scale
  r.body.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(r.body, true);
  assert.ok(Math.abs(box.min.y) < .01 && box.max.y > .4 && box.max.y < .6, `stands ${box.min.y.toFixed(3)}..${box.max.y.toFixed(3)}`);
});

test('the fox walks on the cat\'s clips with its feet planted, and the GLB loader rigs it in place of the procedural fox', async () => {
  const {scene} = readFox();
  const actor = createCreature({name: 'fox', symbol: 100, color: 1});
  const asset = await attachModelAsset(actor, 'fox', {'fox.glb': '/fake/fox.glb'}, {loadAsync: async () => ({scene, animations: []})});
  assert.ok(asset && asset.animator && actor.asset === asset, 'rigged by our code, not by clips in the file');
  let skinned; asset.model.traverse(o => { if (o.isSkinnedMesh) skinned = o; });
  assert.equal(skinned.skeleton.bones.length, 24);
  // walk along +x facing the way it goes, and measure the left forepaw's drift while it stands
  actor.g.rotation.y = Math.PI / 2;
  const leg = asset.rig.legs.lfore, paw = leg.bones[leg.bones.length - 1], p = new THREE.Vector3();
  let checked = 0, worst = 0;
  for (let i = 0; i < 300; i++) {
    actor.g.position.x += .5 / 60; asset.update(1 / 60, true); actor.g.updateMatrixWorld(true);
    if (i > 60 && leg.plant) { paw.getWorldPosition(p); const base = asset.animator.actions[asset.animator.base], u = base.time / base.getClip().duration; if (-Math.cos(u * Math.PI * 2) > .6) { worst = Math.max(worst, p.distanceTo(leg.plant)); checked++; } }
  }
  assert.equal(asset.animator.base, 'walk');
  assert.ok(checked > 10, `stance frames checked: ${checked}`);
  assert.ok(worst < .03, `a planted paw stays within ${worst.toFixed(4)} of its pin`);
  // stopping settles to idle, and the tail keeps moving
  for (let i = 0; i < 120; i++) asset.update(1 / 60, false);
  assert.equal(asset.animator.base, 'idle');
});
