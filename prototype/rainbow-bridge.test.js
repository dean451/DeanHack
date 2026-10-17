import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {featureKind,createTerrainFeature} from './terrain-feature.js';
import {RAINBOW_COLORS} from './rainbow-bridge.js';

// mapglyph.c colours the Valkyrie locate level's magic platform rows 8..13 in ROYGBV order.
const ROWS=[1,9,11,10,4,13];

test('every rainbow bridge row is a feature, not a "." label over plain floor', () => {
  for (const color of ROWS) assert.equal(featureKind(46, color), `rainbow-${color}`);
  assert.equal(featureKind(46, 7), 'magic-platform', 'the plain magic platform keeps its slate slab');
  assert.equal(featureKind(46, 6), 'ice');
});

test('a rainbow bridge square is a slab of light in its row\'s hue over open sky, two draws', () => {
  for (const color of ROWS) {
    const f = createTerrainFeature(`rainbow-${color}`, 3);
    assert.equal(f.userData.hidesFloor, true);
    const meshes = []; f.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.equal(meshes.length, 2);
    const light = meshes.find(m => m.userData.part === 'light');
    assert.equal(light.material.emissive.getHex(), new THREE.Color(RAINBOW_COLORS[color]).getHex());
    assert(light.material.transparent && light.material.opacity > .6);
    for (const v of light.geometry.attributes.position.array) assert(Number.isFinite(v));
    // squares join: the slab spans the whole tile
    light.geometry.computeBoundingBox();
    assert(light.geometry.boundingBox.max.x >= .5 && light.geometry.boundingBox.min.z <= -.5);
    f.userData.dispose();
  }
  const hues = ROWS.map(c => { const h = {}; new THREE.Color(RAINBOW_COLORS[c]).getHSL(h); return h.h; });
  assert.equal(new Set(hues.map(h => Math.round(h * 20))).size, 6, 'six distinct hues');
});
