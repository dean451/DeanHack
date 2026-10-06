import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol) => { const a = createCreature({name, symbol, color: 0}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('the grown nagas tower over their hatchlings', () => {
  const hatch = size('red naga hatchling', 83).y;
  for (const n of ['red naga', 'black naga', 'golden naga', 'guardian naga', 'white naga']) assert(size(n, 83).y > hatch * 1.2, n);
});

test('the white naga is the greatest of them', () => {
  assert(size('white naga', 83).y > size('red naga', 83).y * 1.15);
});
