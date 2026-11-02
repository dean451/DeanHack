import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createDimLayer} from './dim-layer.js';
import {liveSource} from './live-source.js';

test('every dimmed square is one instance of one plane: one draw, one material', () => {
  const group = new THREE.Group(), layer = createDimLayer(THREE, group, {color: 0x15171c, opacity: .74, start: 2});
  const tiles = new Map();
  for (let x = 0; x < 5; x++) { const t = new THREE.Group(); t.position.set(x, 0, 2); group.add(t); t.userData.fog = layer.stand(t); tiles.set(`${x},2`, t); }
  assert.equal(layer.sync(tiles), 0, 'nothing dimmed yet');
  for (const t of [...tiles.values()].slice(0, 3)) t.userData.fog.visible = true;
  layer.touch(); assert.equal(layer.sync(tiles), 3);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(); layer.mesh.getMatrixAt(2, m); p.setFromMatrixPosition(m);
  assert.deepEqual(p.toArray().map(v => +v.toFixed(3)), [2, .012, 2]);
  assert.equal(layer.mesh.material.opacity, .74); assert.ok(layer.mesh.material.transparent);
  assert.equal(group.children.filter(o => o.isInstancedMesh).length, 1, 'one draw');
  for (const t of tiles.values()) t.userData.fog.visible = true;
  layer.touch(); assert.equal(layer.sync(tiles), 5, 'grows past its start size');
  tiles.get('0,2').visible = false; layer.touch(); assert.equal(layer.sync(tiles), 4, 'a hidden square drops out');
  assert.ok(!layer.mesh.castShadow, 'never in the shadow pass');
});

test('live.js dims through the layer and no longer marks materials for recompiling each frame', () => {
  const live = liveSource();
  assert.match(live, /function setDim\(tile,dim\)\{if\(tile\.userData\.fog\.visible===dim\)return;tile\.userData\.fog\.visible=dim;dimLayer\.touch\(\);\}/);
  assert.doesNotMatch(live, /fog\.material\.needsUpdate/);
  assert.match(live, /dimLayer\.sync\(tiles\);/);
});
