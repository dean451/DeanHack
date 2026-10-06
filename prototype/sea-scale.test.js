import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = name => { const a = createCreature({name, symbol: 59, color: 7}); a.g.updateMatrixWorld(true); const s = new THREE.Box3().setFromObject(a.g).getSize(new THREE.Vector3()); return Math.max(s.x, s.y, s.z); };

test('sharks and eels loom larger than a piranha', () => {
  const piranha = size('piranha');
  for (const name of ['shark', 'giant eel', 'electric eel']) assert(size(name) > piranha * 1.5, name);
});
