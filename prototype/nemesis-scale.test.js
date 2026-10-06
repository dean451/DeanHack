import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol = 64) => { const a = createCreature({name, symbol, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('Master Kaen and the Master Assassin loom over a plain human', () => {
  const human = size('human').y;
  assert(size('Master Kaen').y > human * 1.15);
  assert(size('Master Assassin').y > human * 1.05);
});
