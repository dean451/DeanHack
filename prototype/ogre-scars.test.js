import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('ogre lords and kings carry chest scars; the plain ogre stays clean; all fit their tile', () => {
  for (const name of ['ogre', 'ogre lord', 'ogre king']) {
    const c = createCreature({name, symbol: 79, color: 3});
    assert.equal(!!c.g.userData.scarred, name !== 'ogre', name);
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, name + ' stands on the floor');
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, name + ' fits its tile');
  }
});
