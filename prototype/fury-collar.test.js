import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const named = (name, mat) => {
  let n = 0;
  createCreature({name, symbol: 38, color: 1}).g.traverse(o => { if (o.isMesh && o.material.name === mat) n += o.geometry.attributes.position.count; });
  return n;
};

test('the erinys wears an iron spiked collar and a snapped chain, and fits her tile', () => {
  assert(named('erinys', 'fury-collar') > 0, 'collar');
  assert(named('erinys', 'fury-chain') > 0, 'chain');
  const c = createCreature({name: 'erinys', symbol: 38, color: 1});
  c.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(c.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, 'fits her tile');
});

test('other slim demons wear no collar', () => {
  assert.equal(named('incubus', 'fury-collar') + named('succubus', 'fury-chain'), 0);
});
