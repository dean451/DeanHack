import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = (name, symbol) => { const a = createCreature({name, symbol, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('every troll looms at least 10% over a plain human, the olog-hai most of all', () => {
  const human = height('human', 64);
  for (const n of ['troll', 'ice troll', 'rock troll', 'water troll', 'olog-hai']) assert(height(n, 84) > human * 1.1, n);
  for (const n of ['troll', 'ice troll', 'rock troll', 'water troll']) assert(height('olog-hai', 84) > height(n, 84), n);
});

test('trolls still fit inside one tile', () => {
  for (const n of ['troll', 'ice troll', 'rock troll', 'water troll', 'olog-hai']) {
    const a = createCreature({name: n, symbol: 84, color: 7}); a.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(a.g);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.15, n);
  }
});
