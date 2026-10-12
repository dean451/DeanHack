import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('purple worms carry raked spear-gouges; the baby and the long worm stay clean', () => {
  const c = createCreature({name: 'purple worm', symbol: 87, color: 5});
  assert.equal(c.g.userData.gouged, true);
  c.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(c.g, true);
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, 'fits its tile');
  for (const name of ['baby purple worm', 'long worm']) {
    assert(!createCreature({name, symbol: 87, color: 5}).g.userData.gouged, name + ' stays clean');
  }
});

test('the long worm has a ridge of blackened horn knobs; the baby long worm stays smooth', () => {
  assert.equal(createCreature({name: 'long worm', symbol: 87, color: 3}).g.userData.ridged, true);
  assert(!createCreature({name: 'baby long worm', symbol: 87, color: 3}).g.userData.ridged);
});
