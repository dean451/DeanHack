import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 85, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the shambling horror looms over an ordinary orc', () => {
  assert(height('shambling horror') > height('hill orc') * 1.15);
});
