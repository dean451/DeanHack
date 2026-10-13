import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 113, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the leocrotta stands larger than a rothe', () => {
  assert(height('leocrotta') > height('rothe') * 1.3);
});

test('the leocrotta carries a broken spear-head in its shoulder and still fits its tile', () => {
  const a = createCreature({name: 'leocrotta', symbol: 113, color: 7});
  assert.equal(a.g.userData.speared, true);
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g, true);
  assert(b.min.y > -0.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5);
});
