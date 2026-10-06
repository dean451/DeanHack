import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol) => { const a = createCreature({name, symbol, color: 0}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('the trapper spreads wider than the lurker above', () => {
  const t = size('trapper', 116), l = size('lurker above', 116);
  assert(t.x > l.x * 1.1 && l.x > 0);
  assert.equal(createCreature({name: 'trapper', symbol: 116, color: 0}).g.scale.x, 1.3);
});
