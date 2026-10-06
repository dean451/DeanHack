import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol) => { const a = createCreature({name, symbol, color: 0}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('the black pudding is a larger mass than a brown pudding', () => {
  const black = size('black pudding', 80), brown = size('brown pudding', 80);
  assert(black.y > brown.y * 1.3 && black.x > brown.x * 1.3);
});
