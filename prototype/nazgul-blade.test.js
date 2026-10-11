import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the Nazgul carries a notched blade and still fits its tile', () => {
  const c = createCreature({name: 'nazgul', symbol: 87, color: 1});
  c.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(c.g, true);
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, 'fits its tile');
  let meshes = 0;
  c.g.traverse(o => { if (o.isMesh) meshes++; });
  assert(meshes > 27, 'carries the blade notches');
});
