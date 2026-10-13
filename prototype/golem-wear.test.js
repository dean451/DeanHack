import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const glowVerts = name => {
  const a = createCreature({ name, symbol: 39, color: 7 });
  const core = a.g.children[0].children.find(m => m.userData.part === 'core');
  return core.geometry.attributes.position.count;
};
const meshes = name => { let n = 0; createCreature({ name, symbol: 39, color: 7 }).g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('the stone golem has lit runes gouged down its belly; the clay golem has none', () => {
  assert(glowVerts('stone golem') > glowVerts('clay golem'));
});

test('the glass golem shows light through fracture seams; the clay golem does not', () => {
  assert(glowVerts('glass golem') > glowVerts('clay golem'));
});

test('the new golem details add no meshes', () => {
  assert.equal(meshes('stone golem'), meshes('clay golem'));
  assert.equal(meshes('glass golem'), meshes('clay golem'));
});
