import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const named = (name, mat) => {
  let n = 0;
  createCreature({name, symbol: 38, color: 1}).g.traverse(o => { if (o.isMesh && o.material.name === mat) n += o.geometry.attributes.position.count; });
  return n;
};

test('the pit fiend and Nalzok are branded with a glowing sigil and iron shoulder spurs', () => {
  for (const name of ['pit fiend', 'Nalzok']) {
    assert(named(name, 'demon-brand') > 0, `${name}: sigil`);
    assert(named(name, 'demon-spur') > 0, `${name}: spurs`);
    const c = createCreature({name, symbol: 38, color: 1});
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, `${name} stands on the floor`);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, `${name} fits its tile`);
  }
});

test('other devils are not branded', () => {
  assert.equal(named('barbed devil', 'demon-brand') + named('Asmodeus', 'demon-spur'), 0);
});
