import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the remorhaz is a big worm with white-hot seams and cooled back plates', () => {
  const r = createCreature({name: 'remorhaz', symbol: 87, color: 1});
  assert.equal(r.g.userData.molten, true);
  const names = new Set();
  r.g.traverse(o => { if (o.material && o.material.name) names.add(o.material.name); });
  assert(names.has('worm-heat') && names.has('worm-plates'));
  const plain = createCreature({name: 'long worm', symbol: 87, color: 3});
  assert(!plain.g.userData.molten);
  assert(r.g.scale.x > plain.g.scale.x, 'bigger than a long worm');
  r.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(r.g, true);
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, 'fits its tile');
});
