import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const zruty = () => createCreature({name: 'zruty', symbol: 122, color: 3});

test('the zruty towers over an umber hulk, its claws and flank crusted with old blood', () => {
  const z = zruty(), h = createCreature({name: 'umber hulk', symbol: 85, color: 3});
  assert(z.g.scale.y >= 1.5, 'larger than life');
  assert(z.g.scale.y > h.g.scale.y, 'bigger than the hulk');
  let gore = 0;
  z.g.traverse(o => { if (o.isMesh && o.material.color.getHexString() === '3c0e0c') gore++; });
  assert(gore >= 1, 'bloodied claws and scars');
  z.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(z.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.3, 'fits its tile');
});
