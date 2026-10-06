import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = (name, symbol) => { const a = createCreature({name, symbol, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the plain troll stands larger than it did and no smaller than the ice troll', () => {
  assert(height('troll', 84) >= height('water troll', 84));
  assert(height('troll', 84) >= height('ice troll', 84));
});

test('the vampire stands a little taller than a plain human', () => {
  assert(height('vampire', 86) > height('human', 64) * 1.0);
});
