import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {boneGeometries, boneMaterial, placeBone, SHAPES} from './bone-shards.js';

// bone-shards.js: the bones a kill leaves, as small lit solids built once and shared.
test('five bone shapes, each one geometry resting on the floor with finite, ivory-to-stain vertex colours', () => {
  const g = boneGeometries();
  assert.deepEqual(SHAPES, ['long', 'rib', 'splinter', 'vertebra', 'skull']);
  for (const key of SHAPES) {
    const geo = g[key]; geo.computeBoundingBox();
    assert.ok(geo.boundingBox.min.y > -.02 && geo.boundingBox.min.y < .02, `${key} rests on the floor (${geo.boundingBox.min.y})`);
    assert.ok(geo.boundingBox.max.y < 1, `${key} lies low`);
    for (const v of geo.attributes.position.array) assert.ok(Number.isFinite(v));
    const c = geo.attributes.color; assert.ok(c && c.itemSize === 3);
    for (let i = 0; i < c.count; i++) { assert.ok(c.getX(i) >= c.getZ(i) - 1e-6, `${key} warm: red at least blue`); assert.ok(c.getX(i) <= .9 && c.getZ(i) >= .1); }
  }
  assert.equal(boneGeometries(), g, 'built once');
  assert.ok(g.long.attributes.position.count > g.splinter.attributes.position.count, 'the long bone carries its condyles');
});

test('a placed bone lies nearly flat at a small random tilt, scaled by the mark, casting no shadow', () => {
  const mesh = new THREE.Mesh(boneGeometries().rib, boneMaterial());
  placeBone(mesh, 'rib', {x: 3, z: 4, rot: 1.2, s: 1.1, seed: 5}, .13);
  assert.ok(Math.abs(mesh.rotation.x) < .15 && Math.abs(mesh.rotation.z) < .15 && mesh.rotation.y === 1.2);
  assert.ok(Math.abs(mesh.scale.x - .143) < 1e-9 && mesh.position.y < .01 && !mesh.castShadow && mesh.receiveShadow);
  const skull = new THREE.Mesh(boneGeometries().skull, boneMaterial()); placeBone(skull, 'skull', {x: 0, z: 0, rot: 0, s: 1}, .11);
  assert.ok(skull.scale.x > .13, 'a skull reads a little bigger');
  assert.ok(boneMaterial().vertexColors && !boneMaterial().transparent, 'one shared look, opaque until a fade');
});
