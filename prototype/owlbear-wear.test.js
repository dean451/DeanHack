import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the owlbear carries a broken arrow and a torn-off talon, in the same meshes and tile', () => {
  const o = createCreature({name: 'owlbear', symbol: 'Y'.charCodeAt(0), color: 3});
  let meshes = 0;
  o.g.traverse(m => { if (m.isMesh) meshes++; });
  assert(meshes <= 12, 'merged parts only: ' + meshes);
  const tris = m => m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
  const arms = [];
  o.g.traverse(m => { if (m.isMesh && m.userData.part === 'arm') arms.push(tris(m)); });
  assert.equal(arms.length, 2);
  assert(arms[1] < arms[0] + 400 && arms[0] !== arms[1], 'the arms differ: the right paw lost a talon');
  o.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o.g);
  assert(b.min.y > -0.05 && b.max.y < 1.9);
});
