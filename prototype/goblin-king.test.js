import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const top = name => { const a = createCreature({name, symbol: 111, color: 1}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the Goblin King has an orc model of his own, taller than a captain, not a generic orc', () => {
  const king = createCreature({name: 'Goblin King', symbol: 111, color: 1});
  assert.equal(king.g.name, 'goblin king');
  assert(top('Goblin King') > top('orc-captain'), 'taller than the orc-captain');
});
