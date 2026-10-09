import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = (name, symbol) => { const a = createCreature({name, symbol, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the Angel and the Aleax stand over a plain human, below the archon', () => {
  const human = height('human', 64);
  assert(height('Angel', 65) > human * 1.1);
  assert(height('Aleax', 65) > human * 1.05);
  assert(height('archon', 65) >= height('Angel', 65));
  assert(height('Angel', 65) > height('Aleax', 65));
});
