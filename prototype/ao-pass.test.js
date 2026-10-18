import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sitsOut, AO_PARAMS, DungeonAOPass} from './ao-pass.js';

// ao-pass.js: GTAO with see-through meshes kept out of its depth and normal buffer.
test('see-through and non-depth-writing meshes, points and lines sit the occlusion pass out; solid meshes do not', () => {
  const solid = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({transparent: true}));
  const fog = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({depthWrite: false}));
  const motes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()), halo = new THREE.Sprite(new THREE.SpriteMaterial());
  assert.ok(!sitsOut(solid)); assert.ok(sitsOut(flame)); assert.ok(sitsOut(fog)); assert.ok(sitsOut(motes)); assert.ok(sitsOut(halo), 'the torch halo sprite');
  flame.visible = false; assert.ok(!sitsOut(flame), 'already hidden: nothing to do');
  assert.ok(AO_PARAMS.radius > .1 && AO_PARAMS.radius < 1, 'radius in tile units');
  assert.match(DungeonAOPass.prototype._overrideVisibility.toString(), /sitsOut/);
});

test('ink outline hulls stay out of the occlusion pass', () => {
  const hull = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()); hull.userData.outline = true;
  assert.ok(sitsOut(hull));
  const plain = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()); assert.ok(!sitsOut(plain));
});
