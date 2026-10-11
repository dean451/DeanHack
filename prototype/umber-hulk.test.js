import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const hulk = () => createCreature({name: 'umber hulk', symbol: 85, color: 3});

test('the umber hulk looms over a man and its carapace is cracked with glowing heat', () => {
  const h = hulk();
  assert(h.g.scale.y >= 1.4, 'larger than life');
  let glow = 0;
  h.g.traverse(o => { if (o.isMesh && o.material.emissiveIntensity > 0.5) glow++; });
  assert(glow >= 5, 'two compound eyes plus the carapace rift glow');
  h.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(h.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.2, 'fits its tile');
});
