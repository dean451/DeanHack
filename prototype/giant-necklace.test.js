import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the plain giant wears a thong of knucklebones; other giants do not, and it fits its tile', () => {
  const c = createCreature({name: 'giant', symbol: 72, color: 1});
  assert.equal(c.g.userData.necklaced, true);
  for (const n of ['hill giant', 'stone giant', 'ettin']) assert.equal(createCreature({name: n, symbol: 72, color: 1}).g.userData.necklaced, undefined, n);
  c.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(c.g, true);
  assert(b.min.y > -0.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.8);
});
