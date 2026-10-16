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

const bodyVerts = name => createCreature({ name, symbol: 39, color: 7 }).g.children[0].children.find(m => m.userData.part === 'body').geometry.attributes.position.count;

test('the clay golem glows through cracked seams down its left chest', () => {
  const clay = createCreature({ name: 'clay golem', symbol: 39, color: 7 });
  const core = clay.g.children[0].children.find(m => m.userData.part === 'core').geometry;
  core.computeBoundingBox();
  assert(core.boundingBox.min.x < -0.1, 'seams run down the left side');
  assert.equal(meshes('clay golem'), meshes('wax golem'));
});

test('the flesh golem has three ribs showing through a torn flank, adding no meshes', () => {
  assert(bodyVerts('flesh golem') > bodyVerts('leather golem') + 4 * 24 - 1);
  assert.equal(meshes('flesh golem'), meshes('leather golem'));
});

test('the gold golem has three axe-chops hacked across its chest, adding no meshes', () => {
  const gold = bodyVerts('gold golem');
  assert.equal(gold - bodyVerts('rope golem'), 240 + 3 * 36);
  assert.equal(meshes('gold golem'), meshes('rope golem'));
});
