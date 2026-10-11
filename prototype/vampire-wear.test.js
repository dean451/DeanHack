import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('vampires wear a ragged cape hem and dried blood and still fit their tile and the floor', () => {
  for (const name of ['vampire', 'vampire lord', 'vampire mage', 'vlad the impaler']) {
    const c = createCreature({name, symbol: 86, color: 1});
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, name + ' stands on the floor');
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, name + ' fits its tile');
    let meshes = 0;
    c.g.traverse(o => { if (o.isMesh) meshes++; });
    assert(meshes > 21, name + ' carries the tatters and stains');
  }
});
