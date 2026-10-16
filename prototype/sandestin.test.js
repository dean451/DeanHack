import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the sandestin sheds grit and cracks where the djinni stays whole, and fits its tile', () => {
  const s = createCreature({name: 'sandestin', symbol: 38, color: 7});
  const d = createCreature({name: 'djinni', symbol: 38, color: 7});
  assert(s.g.userData.sand && !d.g.userData.sand);
  s.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(s.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, 'fits its tile');
});
