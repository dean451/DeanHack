import test from 'node:test';
import assert from 'node:assert/strict';
import {createGridBug} from './grid-bug.js';

test('the grid bug has hooked mandibles in front of its mouth', () => {
  const {g} = createGridBug();
  let cones = 0;
  g.traverse(o => { if (o.geometry?.type === 'ConeGeometry') cones++; });
  assert.equal(cones, 2);
  g.userData.dispose();
});
