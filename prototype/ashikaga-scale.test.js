import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol = 64) => { const a = createCreature({name, symbol, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('Ashikaga Takauji looms over a plain human', () => {
  assert(size('Ashikaga Takauji').y > size('human').y * 1.1);
});

test('the Minion of Huhetotl towers over a plain demon', () => {
  assert(size('Minion of Huhetotl', 38).y > size('imp', 38).y * 1.5);
  assert(size('Minion of Huhetotl', 38).y > size('human').y);
});
