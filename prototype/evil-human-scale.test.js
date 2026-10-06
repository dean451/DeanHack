import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 64, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()).y; };

test('the Executioner towers over a plain human and the black marketeer stands above one', () => {
  const human = height('human');
  assert(height('Executioner') > human * 1.15);
  assert(height('black marketeer') > human * 1.1);
});
