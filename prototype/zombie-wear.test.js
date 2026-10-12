import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const bodyVerts = name => {
  const z = createCreature({name, symbol: 90, color: 7});
  let n = 0;
  z.g.traverse(o => { if (o.isMesh && o.userData.part === 'body') n = o.geometry.attributes.position.count; });
  return {n, z};
};

test('the giant zombie carries the broken spear in its back', () => {
  const g = bodyVerts('giant zombie').n, base = bodyVerts('human zombie').n;
  assert(g > base + 40, `giant body ${g} vs human ${base}`);
  const {z} = bodyVerts('giant zombie');
  z.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(z.g);
  assert(b.min.y > -0.05 * z.g.scale.y);
});

test('the ettin zombie wears a spiked iron collar and keeps its mesh count', () => {
  const {n, z} = bodyVerts('ettin zombie');
  assert(n > bodyVerts('human zombie').n + 40);
  let meshes = 0;
  z.g.traverse(o => { if (o.isMesh) meshes++; });
  assert.equal(meshes, 9);
});
