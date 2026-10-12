import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the stalker has hooked claws and a fanged maw the air elemental lacks, and fits its tile', () => {
  const s = createCreature({name: 'stalker', symbol: 69, color: 7});
  const a = createCreature({name: 'air elemental', symbol: 69, color: 7});
  assert(s.g.userData.stalker && !a.g.userData.stalker);
  let sm = 0, am = 0;
  s.g.traverse(o => { if (o.isMesh) sm++; });
  a.g.traverse(o => { if (o.isMesh) am++; });
  assert(sm > am, 'more detail than the air elemental');
  s.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(s.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, 'fits its tile');
});
