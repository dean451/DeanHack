import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = name => { const a = createCreature({name, symbol: 68, color: 3}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('the serpent dragons loom larger than a fresh body plan, grown up more than babies', () => {
  for (const name of ['amphitere', 'lindworm', 'tatzelworm', 'guivre', 'leviathan']) {
    const adult = createCreature({name, symbol: 68, color: 3});
    assert(adult.g.scale.x >= 1.15, name);
    assert(size(name).y > size('baby ' + name).y * 1.4, name);
  }
});
