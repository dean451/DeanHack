import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 113, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the mumak and mastodon stand taller than they did', () => {
  assert(height('mumak') > 1.3);
  assert(height('mastodon') > 1.4);
});

test('the titanothere and baluchitherium are larger than before', () => {
  assert(height('titanothere') > 1.1);
  assert(height('baluchitherium') > 1.45);
});
