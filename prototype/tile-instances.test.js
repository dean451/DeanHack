import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTileInstancer, instanceable, PROMOTE_AT} from './tile-instances.js';

// tile-instances.js: floor slabs, wall blocks and pebbles draw as instances, one draw per pair.
const slabGeo = new THREE.BoxGeometry(.97, .14, .97), wallGeo = new THREE.BoxGeometry(.97, .7, .97), floorMat = new THREE.MeshStandardMaterial(), wallMat = new THREE.MeshStandardMaterial();
function tile(root, x, z, wall = false) {
  const t = new THREE.Group(); t.position.set(x, 0, z); root.add(t);
  const slab = new THREE.Mesh(slabGeo, floorMat); slab.position.y = -.1; slab.castShadow = slab.receiveShadow = true; t.add(slab); t.userData.slab = slab;
  const fog = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({transparent: true, opacity: 0})); t.add(fog);
  if (wall) { const w = new THREE.Mesh(wallGeo, wallMat); w.position.y = .28; w.castShadow = w.receiveShadow = true; t.add(w); }
  return t;
}
const layer0 = new THREE.Layers();

test('plain shadowing meshes are instanceable; fog planes, labelled and transparent ones are not', () => {
  const root = new THREE.Group(), t = tile(root, 0, 0, true);
  assert.ok(instanceable(t.userData.slab)); assert.ok(instanceable(t.children[2]));
  assert.ok(!instanceable(t.children[1]), 'the fog plane is transparent');
  const labelled = new THREE.Mesh(slabGeo, floorMat); labelled.castShadow = labelled.receiveShadow = true; labelled.userData.part = 'x';
  assert.ok(!instanceable(labelled));
  const pebble = new THREE.Mesh(slabGeo, floorMat); pebble.receiveShadow = true;
  assert.ok(instanceable(pebble), 'a pebble only receives shadows; it bins apart from the slabs');
  const custom = new THREE.Mesh(slabGeo, new THREE.ShaderMaterial());
  assert.ok(!instanceable(custom), 'a custom shader has to opt into instancing itself');
});

test('a room of tiles becomes one draw per pair once the pair has enough; proxies hide and their instances sit where they stand', () => {
  const root = new THREE.Group(), inst = createTileInstancer(root);
  const tiles = [];
  for (let x = 0; x < 6; x++) for (let z = 0; z < 4; z++) tiles.push(tile(root, x, z, x === 0 || z === 0));
  for (const t of tiles) inst.add(t);
  assert.equal(inst.draws, 2, 'slabs and walls');
  assert.ok(!tiles[7].userData.slab.layers.test(layer0), 'the slab proxy is off the camera layer');
  root.updateMatrixWorld(true); inst.sync(1);
  const slabs = inst.meshes().find(mm => mm.geometry === slabGeo);
  assert.equal(slabs.count, 24);
  const got = new THREE.Matrix4(), want = tiles[7].userData.slab.matrixWorld;
  let found = false; for (let i = 0; i < slabs.count; i++) { slabs.getMatrixAt(i, got); if (got.elements.every((v, k) => Math.abs(v - want.elements[k]) < 1e-6)) found = true; }
  assert.ok(found, 'an instance carries the slab\'s world matrix');
  // too few of a kind: left alone
  const few = createTileInstancer(root); const t2 = tile(new THREE.Group(), 9, 9); few.add(t2);
  assert.equal(few.draws, 0); assert.ok(t2.userData.slab.layers.test(layer0));
  assert.equal(PROMOTE_AT, 2, 'a pair is already a saving');
});

test('a hidden slab gets a zero instance, a released tile drops out, clear() restores everything', () => {
  const root = new THREE.Group(), inst = createTileInstancer(root, {promoteAt: 4});
  const tiles = []; for (let x = 0; x < 8; x++) tiles.push(tile(root, x, 0));
  for (const t of tiles) inst.add(t);
  root.updateMatrixWorld(true); inst.sync(1);
  tiles[3].userData.slab.visible = false; inst.refresh(); inst.sync(2);
  const slabs = inst.meshes()[0], got = new THREE.Matrix4();
  let zeros = 0; for (let i = 0; i < slabs.count; i++) { slabs.getMatrixAt(i, got); if (got.elements[0] === 0 && got.elements[5] === 0) zeros++; }
  assert.equal(zeros, 1);
  root.remove(tiles[5]); inst.refresh(); inst.sync(3);
  assert.equal(slabs.count, 7); assert.equal(inst.size, 7);
  inst.sync(3); // same frame: no second pass
  inst.clear();
  assert.equal(inst.size, 0); assert.equal(inst.draws, 0); assert.ok(tiles[0].userData.slab.layers.test(layer0));
});

test('the instanced mesh grows when a level outgrows it', () => {
  const root = new THREE.Group(), inst = createTileInstancer(root, {promoteAt: 4, start: 4});
  for (let x = 0; x < 20; x++) inst.add(tile(root, x, 0));
  root.updateMatrixWorld(true); inst.sync(1);
  const slabs = inst.meshes()[0];
  assert.equal(slabs.count, 20); assert.ok(slabs.instanceMatrix.count >= 20);
});

test('a proxy keeps a frozen local matrix while instanced (no per-pass recompose) and gets it back when it leaves', () => {
  const root = new THREE.Group(), inst = createTileInstancer(root);
  const geo = new THREE.BoxGeometry(1, .1, 1), mat = new THREE.MeshStandardMaterial();
  const tiles = [0, 1].map(i => { const t = new THREE.Group(); t.position.set(i, 0, 0); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.position.y = .05; t.add(m); root.add(t); return t; });
  inst.add(tiles[0]); inst.add(tiles[1]);
  const proxies = tiles.map(t => t.children[0]);
  assert.ok(proxies.every(p => p.matrixAutoUpdate === false && p.matrix.elements[13] === .05), 'composed once, then frozen');
  root.updateMatrixWorld(true);
  assert.equal(proxies[1].matrixWorld.elements[12], 1, 'the world matrix still follows the tile');
  inst.clear();
  assert.ok(proxies.every(p => p.matrixAutoUpdate === true));
});

// The rock on the stairs (the user, 2026-11-03: "when you go up stairs a big rock flickers on the character model and
// goes away"). three uploads an InstancedMesh's matrices while it gathers the scene, before onBeforeRender, so a new
// level's first frame drew the pebbles' constructor identity matrices: a unit rock at the origin, where the hero stood.
test('the frame syncs the tile instances after the world matrices and before the draw', () => {
  const main = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  const i = main.indexOf('scene.updateMatrixWorld();'), j = main.indexOf('live.syncInstances();'), k = main.indexOf('composer.render();');
  assert.ok(i >= 0 && j > i && k > j, 'updateMatrixWorld, then syncInstances, then the draw');
  assert.match(readFileSync(new URL('./live.js', import.meta.url), 'utf8'), /syncInstances\(\)\{tileInstances\.sync\(\);\}/);
});

test('a sync before the draw leaves the instances in place, so the render hook has nothing left to do', () => {
  const root = new THREE.Group(), inst = createTileInstancer(root), geo = new THREE.DodecahedronGeometry(1, 0), mat = new THREE.MeshStandardMaterial();
  const tiles = [0, 1].map(x => { const t = new THREE.Group();t.position.set(x * 3, 0, 5);const p = new THREE.Mesh(geo, mat);p.scale.setScalar(.03);t.add(p);root.add(t);return t; });
  for (const t of tiles) inst.add(t);
  root.updateMatrixWorld(true);
  inst.sync();
  const mesh = inst.meshes()[0], m = new THREE.Matrix4(), s = new THREE.Vector3();
  assert.equal(mesh.count, 2);
  for (let k = 0; k < 2; k++) { mesh.getMatrixAt(k, m);s.setFromMatrixScale(m);assert.ok(s.x < .05, `instance ${k} is pebble-sized, not a unit rock`); }
  const before = mesh.instanceMatrix.version;mesh.onBeforeRender({info: {render: {frame: 7}}});
  assert.equal(mesh.instanceMatrix.version, before, 'nothing changes inside the draw');
});
