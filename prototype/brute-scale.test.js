import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = name => { const a = createCreature({name, symbol: 39, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('ogres grow with rank, and the king looms', () => {
  const ogre = size('ogre'), lord = size('ogre lord'), king = size('ogre king');
  assert(lord.y > ogre.y && king.y > lord.y * 1.1);
});

test('the umber hulk and the zruty are larger than a plain ogre', () => {
  const ogre = size('ogre');
  assert(size('umber hulk').y > ogre.y * 1.05);
  assert(size('zruty').y > ogre.y * 1.1);
});
