import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol = 64) => { const a = createCreature({name, symbol, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('Medusa towers over a plain human', () => {
  assert(size('Medusa').y > size('human').y * 1.15);
});

test('the Wizard of Yendor, Croesus and the Dark One loom over a plain human', () => {
  const human = size('human').y;
  for (const name of ['Wizard of Yendor', 'Croesus', 'Dark One']) assert(size(name).y > human * 1.2, name);
});
