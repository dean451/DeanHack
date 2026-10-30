import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCavern, CHUNK, ROCK_SEGMENTS} from './cavern.js';

globalThis.document ??= {createElement: () => ({width: 0, height: 0, getContext: () => new Proxy({}, {get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => (t[k] = v, true)})})};

test('the rock is drawn in culled chunks of low-poly blocks', () => {
  const group = new THREE.Group(), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), controls = {target: new THREE.Vector3()};
  const cave = createCavern({group, scene, camera, controls});
  assert.equal(cave.chunks.length, Math.ceil(96 / CHUNK) * Math.ceil(37 / CHUNK));
  assert.equal(cave.chunks.reduce((n, m) => n + m.count, 0), 96 * 37, 'every block in exactly one chunk');
  assert.ok(cave.chunks.every(m => m.frustumCulled && m.geometry === cave.chunks[0].geometry && m.material === cave.chunks[0].material), 'culled, one geometry and material shared');
  const g = cave.chunks[0].geometry; assert.ok((g.index ? g.index.count : g.attributes.position.count) / 3 <= 108, 'a block is 108 triangles or fewer');
  assert.equal(ROCK_SEGMENTS, 1);
  // after a level: the chunks' spheres hold their own blocks, so far chunks fall outside the view
  const tiles = new Map([['10,5', {userData: {type: 'floor'}}], ['11,5', {userData: {type: 'floor'}}]]);
  cave.rebuild(tiles, {x: 10, z: 5}, true); cave.update(0, .016, new THREE.Vector3());
  const spheres = cave.chunks.map(m => m.boundingSphere);
  assert.ok(spheres.every(s => s && s.radius < CHUNK * 1.6), 'no chunk sphere spans more than its own square');
});
