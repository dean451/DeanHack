import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('Hippocrates keeps his draw count and fits his tile with a bare-twig wreath and a fanged serpent', () => {
  const c = createCreature({name: 'Hippocrates', symbol: 64, color: 15});
  let n = 0;
  c.g.traverse(o => { if (o.isMesh) n++; });
  assert.equal(n, 8, 'meshes');
  c.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(c.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, 'fits its tile');
});
