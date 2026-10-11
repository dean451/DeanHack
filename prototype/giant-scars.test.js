import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('Lord Surtur carries old war-scars and still fit their tile', () => {
  for (const name of ['lord surtur']) {
    const c = createCreature({name, symbol: 72, color: 1});
    assert.equal(c.g.userData.scarred, true, name + ' is scarred');
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, name + ' stands on the floor');
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.8, name + ' fits its tile');
  }
});
