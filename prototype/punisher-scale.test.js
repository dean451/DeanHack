import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol = 96) => { const a = createCreature({name, symbol, color: 0}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('the Punisher is a black colossus that dwarfs every golem but the crystal ice', () => {
  const p = size('Punisher');
  assert(p.y > size('iron golem').y * 1.1);
  assert(p.y > size('stone golem').y * 1.2);
});
