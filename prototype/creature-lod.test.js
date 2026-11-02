import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {lighten, lightenModel, lodReady, LOD} from './creature-lod.js';
import {createCreature, bakeDraws} from './creatures.js';
import {monsterLodFor} from './quality.js';
import {liveSource} from './live-source.js';

const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const count = root => { let v = 0, t = 0; root.traverse(o => { if (o.isMesh && !o.userData.outline) { v += o.geometry.attributes.position.count; t += tris(o.geometry); } }); return {v, t}; };

test('a monster\'s static parts come back with far fewer triangles and vertices, indexed for the batch', async () => {
  await lodReady;
  const a = bakeDraws(createCreature({name: 'hill orc', kind: 'monster', glyph: 1}));
  const before = count(a.g), saved = lightenModel(a.g, {species: 'test orc'}), after = count(a.g);
  assert.ok(saved > 0 && after.t < before.t * .7 && after.v < before.v * .7, JSON.stringify({before, after}));
  a.g.traverse(o => { if (o.isMesh && o.geometry.userData.lodOf) { assert.ok(o.geometry.index, 'indexed'); for (const k of Object.keys(o.geometry.attributes)) assert.ok(o.geometry.attributes[k].count === o.geometry.attributes.position.count, k); } });
});

test('a skinned body keeps its skin weights, and an outline hull follows the lighter geometry', async () => {
  await lodReady;
  const g = new THREE.SphereGeometry(1, 64, 48).toNonIndexed();
  const n = g.attributes.position.count;
  g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(n * 4).fill(.25), 4));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(.5), 3));
  const bone = new THREE.Bone(), mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial()); mesh.add(bone); mesh.bind(new THREE.Skeleton([bone]));
  const hull = new THREE.Mesh(g, new THREE.MeshBasicMaterial()); hull.userData.outline = true; mesh.add(hull);
  const root = new THREE.Group(); root.add(mesh);
  lightenModel(root);
  assert.notEqual(mesh.geometry, g); assert.equal(hull.geometry, mesh.geometry, 'the ink follows');
  for (const k of ['skinIndex', 'skinWeight', 'color', 'normal']) assert.ok(mesh.geometry.attributes[k], k);
  assert.ok(tris(mesh.geometry) < tris(g) * .6);
});

test('monsters of a kind share one lighter copy; small parts and the high tier are left whole', async () => {
  await lodReady;
  const one = bakeDraws(createCreature({name: 'jackal', kind: 'monster', glyph: 1})), two = bakeDraws(createCreature({name: 'jackal', kind: 'monster', glyph: 1}));
  lightenModel(one.g, {species: 'jackal'}); lightenModel(two.g, {species: 'jackal'});
  const geos = o => { const l = []; o.g.traverse(m => { if (m.isMesh && m.geometry.userData.lodOf) l.push(m.geometry); }); return l; };
  assert.ok(geos(one).length && geos(one).every((g, i) => g === geos(two)[i]), 'shared');
  const small = new THREE.BoxGeometry(1, 1, 1); assert.equal(lighten(small), small);
  LOD.enabled = false; try { const a = bakeDraws(createCreature({name: 'gnome lord', kind: 'monster', glyph: 1})); assert.equal(lightenModel(a.g), 0); } finally { LOD.enabled = true; }
  assert.equal(monsterLodFor('high'), false); assert.equal(monsterLodFor('balanced'), true); assert.equal(monsterLodFor('low'), true);
});

test('live.js lightens a new monster before it is staged and batched; main.js sets it from the tier', () => {
  const live = liveSource(), main = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  const at = live.indexOf('lightenModel(a.g,{species:cell.name})');
  assert.ok(at > 0 && at < live.indexOf('stageCreature(a.g,{disposition});', at) && at < live.indexOf('actorBatch.add(a)', at));
  assert.match(main, /LOD\.enabled=monsterLodFor\(quality\.tier\);/);
});
