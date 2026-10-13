import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('the minotaur stands a head above the ogres', () => {
  const m = createCreature({name: 'minotaur', symbol: 72, color: 1}).g.scale.x;
  assert(m >= 1.35);
});

test('the minotaur has lost the tip of its left horn and still fits its tile', async () => {
  const THREE = await import('three');
  const m = createCreature({name: 'minotaur', symbol: 72, color: 1});
  m.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(m.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, 'fits its tile');
});

test('the minotaur wears skull trophies on its belt without adding draws', () => {
  const m = createCreature({name: 'minotaur', symbol: 72, color: 1});
  let meshes = 0;
  m.g.traverse(o => { if (o.isMesh) meshes++; });
  assert.equal(meshes, 9, 'still nine draws');
});
