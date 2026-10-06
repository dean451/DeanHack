import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 89, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the cockatrice stands larger than its chick', () => {
  assert(height('cockatrice') > height('chickatrice') * 1.6);
});

test('the gelatinous cube looms larger', () => {
  assert(height('gelatinous cube') > 0.6);
});
