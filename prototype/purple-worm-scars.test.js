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
