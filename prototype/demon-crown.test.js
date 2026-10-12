import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the princes of hell wear a spiked iron crown and still fit tile and floor', () => {
  for (const name of ['Geryon', 'Dispater', 'Baalzebub', 'Asmodeus']) {
    const c = createCreature({name, symbol: 38, color: 1});
    let crown = 0;
    c.g.traverse(o => { if (o.isMesh && o.material.name === 'prince-crown') crown++; });
    assert(crown >= 1, `${name}: iron crown`);
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, `${name} stands on the floor`);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, `${name} fits its tile`);
  }
});

test('ordinary devils wear no crown', () => {
  let crown = 0;
  createCreature({name: 'horned devil', symbol: 38, color: 1}).g.traverse(o => { if (o.isMesh && o.material.name === 'prince-crown') crown++; });
  assert.equal(crown, 0);
});
