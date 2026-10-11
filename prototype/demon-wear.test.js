import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('demons and devils carry old raked scars on one flank and still fit tile and floor', () => {
  for (const name of ['vrock', 'barbed devil', 'pit fiend', 'succubus']) {
    const c = createCreature({name, symbol: 38, color: 1});
    let scars = 0;
    c.g.traverse(o => { if (o.isMesh && o.material.name === 'demon-scar') scars++; });
    assert(scars >= 1, `${name}: raked gashes`);
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, `${name} stands on the floor`);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, `${name} fits its tile`);
  }
});

test('the many-armed marilith stays within its mesh cap without the scar', () => {
  let scars = 0;
  createCreature({name: 'marilith', symbol: 38, color: 1}).g.traverse(o => { if (o.isMesh && o.material.name === 'demon-scar') scars++; });
  assert.equal(scars, 0);
});
