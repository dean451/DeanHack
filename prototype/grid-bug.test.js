import test from 'node:test';
import assert from 'node:assert/strict';
import {createGridBug} from './grid-bug.js';

test('the grid bug has hooked mandibles in front of its mouth', () => {
  const {g} = createGridBug();
  let cones = 0;
  g.traverse(o => { if (o.geometry?.type === 'ConeGeometry' && o.parent !== g.children[0]) cones++; });
  assert.equal(cones, 2);
  g.userData.dispose();
});

test('the grid bug carries a ridge of razor spines down its back', () => {
  const {g, body} = createGridBug();
  const spines = body.children.filter(o => o.geometry?.type === 'ConeGeometry' && o.position.x === 0);
  assert.equal(spines.length, 5);
  assert(Math.max(...spines.map(o => o.geometry.parameters.height)) > Math.min(...spines.map(o => o.geometry.parameters.height)), 'tallest over the thorax');
  g.userData.dispose();
});
