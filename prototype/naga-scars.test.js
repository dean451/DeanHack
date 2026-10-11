import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('grown nagas (but the rimed white) carry old scars, hatchlings stay clean, all fit their tile', () => {
  for (const name of ['red naga', 'black naga', 'golden naga', 'guardian naga', 'white naga', 'red naga hatchling']) {
    const c = createCreature({name, symbol: 83, color: 0});
    assert.equal(!!c.g.userData.scarred, !/hatchling|white/.test(name), name);
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, name + ' stands on the floor');
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, name + ' fits its tile');
  }
});
