import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const named = (name, mat) => {
  let n = 0;
  createCreature({name, symbol: 38, color: 1}).g.traverse(o => { if (o.isMesh && o.material.name === mat) n += o.geometry.attributes.position.count; });
  return n;
};

test('Yeenoghu bristles and wears gnawed fangs; Orcus hangs a chain of burning skulls', () => {
  assert(named('Yeenoghu', 'gnoll-mane') > 0, 'bristle ridge');
  assert(named('Yeenoghu', 'gnoll-fangs') > 0, 'fang collar');
  assert(named('Orcus', 'orcus-skull') > 0, 'skull chain');
  assert(named('Orcus', 'orcus-skull-glow') > 0, 'burning sockets');
});

test('other demons carry neither mark, and the lords still fit tile and floor', () => {
  assert.equal(named('Asmodeus', 'gnoll-mane') + named('Asmodeus', 'orcus-skull'), 0);
  for (const name of ['Yeenoghu', 'Orcus']) {
    const c = createCreature({name, symbol: 38, color: 1});
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, `${name} stands on the floor`);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, `${name} fits its tile`);
  }
});
