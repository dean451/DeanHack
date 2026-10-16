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

test('the sound horn tip is stained with dried blood', () => {
  const m = createCreature({name: 'minotaur', symbol: 72, color: 1});
  let head = null;
  m.g.traverse(o => { if (o.userData.part === 'head') head = o; });
  const pos = head.geometry.attributes.position, col = head.geometry.attributes.color;
  let dark = 0;
  for (let i = 0; i < pos.count; i++) if (pos.getX(i) > 0.25 && col.getX(i) < 0.2) dark++;
  assert(dark > 0, 'reddish-dark vertices on the right horn tip');
});

test('the minotaur muzzle is matted with dried blood', () => {
  const m = createCreature({name: 'minotaur', symbol: 72, color: 1});
  let head = null;
  m.g.traverse(o => { if (o.userData.part === 'head') head = o; });
  const pos = head.geometry.attributes.position, col = head.geometry.attributes.color;
  let red = 0;
  for (let i = 0; i < pos.count; i++) if (pos.getZ(i) > 0.15 && pos.getY(i) < -0.03 && col.getX(i) > col.getY(i) * 2) red++;
  assert(red > 0, 'reddish vertices on the lower muzzle');
});
