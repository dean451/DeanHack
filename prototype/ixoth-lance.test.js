import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('Ixoth carries the snapped lance of a Knight in its right flank and still fits its tile', () => {
  const ixoth = createCreature({name: 'ixoth', symbol: 68, color: 1});
  const draken = createCreature({name: 'draken', symbol: 68, color: 1});
  assert.equal(ixoth.g.userData.scarred, true);
  let n = 0, m = 0;
  ixoth.g.traverse(o => { if (o.isMesh) n++; });
  draken.g.traverse(o => { if (o.isMesh) m++; });
  assert(n > m, 'the lance adds meshes');
  ixoth.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(ixoth.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 2.4, 'fits its tile');
});
