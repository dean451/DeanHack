import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = name => { const a = createCreature({name, symbol: 39, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('iron and stone golems tower over the lesser golems', () => {
  const iron = size('iron golem'), stone = size('stone golem');
  for (const lesser of ['clay golem', 'wax golem', 'rope golem']) assert(iron.y > size(lesser).y && stone.y > size(lesser).y, lesser);
  assert(iron.y >= stone.y);
});

test('the glass, ice and crystal ice golems stand taller than a stone golem, the crystal ice most', () => {
  const stone = size('stone golem').y, glass = size('glass golem').y, ice = size('ice golem').y, crystal = size('crystal ice golem').y;
  assert(glass > stone && ice > glass && crystal > ice);
});
