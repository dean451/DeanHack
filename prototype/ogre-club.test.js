import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('ogre lords and kings carry a blood-crusted club; the plain ogre keeps a clean one; all fit', () => {
  for (const name of ['ogre', 'ogre lord', 'ogre king']) {
    const c = createCreature({name, symbol: 79, color: 3});
    assert.equal(!!c.g.userData.bloodyClub, name !== 'ogre', name);
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, name + ' fits its tile');
  }
});

test('ogre lords and kings wear a cord of skulls at the belt; the plain ogre does not', () => {
  for (const name of ['ogre', 'ogre lord', 'ogre king']) {
    const c = createCreature({name, symbol: 79, color: 3});
    assert.equal(!!c.g.userData.skullBelt, name !== 'ogre', name);
  }
});
