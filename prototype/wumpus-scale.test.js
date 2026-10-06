import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the wumpus looms over a rothe', () => {
  const size = name => { const a = createCreature({name, symbol: 113, color: 3}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };
  assert(size('wumpus') > size('rothe') * 0.7);
  assert(size('wumpus') > .6);
});
