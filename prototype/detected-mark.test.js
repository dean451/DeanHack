import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDetectedMark, syncDetectedMark} from './detected-mark.js';

test('a detected item gets one glowing ring, which comes off when the hero sees the square', () => {
  const item = new THREE.Group();
  assert.equal(syncDetectedMark(item, true), true);
  assert.equal(item.children.filter(c => c.name === 'detected-mark').length, 1);
  assert.equal(syncDetectedMark(item, true), true);
  assert.equal(item.children.filter(c => c.name === 'detected-mark').length, 1, 'not added twice');
  assert.equal(syncDetectedMark(item, false), false);
  assert.equal(item.children.length, 0);
  assert.equal(syncDetectedMark(item, false), false);
});

test('the ring is a flat unlit glow that does not depend on the floor light, and frees its resources', () => {
  const mark = createDetectedMark();
  const meshes = []; mark.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.ok(meshes.length >= 1 && meshes.length <= 2);
  for (const m of meshes) assert.ok(m.material.isMeshBasicMaterial, 'basic material: lit by itself');
  const box = new THREE.Box3().setFromObject(mark);
  assert.ok(box.max.y - box.min.y < 0.1, 'lies flat on the floor');
  let disposed = 0; const geos = meshes.map(m => m.geometry);
  for (const g of geos) { const d = g.dispose.bind(g); g.dispose = () => { disposed++; d(); }; }
  mark.userData.dispose();
  assert.equal(disposed, geos.length);
});
