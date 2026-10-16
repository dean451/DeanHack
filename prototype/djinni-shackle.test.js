import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const mats = name => {const c = createCreature({name, symbol: 38, color: 7}), set = new Set();
  c.g.traverse(o => {if (o.isMesh) set.add(o.material.name);}); return set;};

test('the djinni wears a locked iron shackle on one wrist; the sandestin does not', () => {
  assert(mats('djinni').has('djinni-shackle'));
  assert(!mats('sandestin').has('djinni-shackle'));
});

test('the djinni is cut from flat planes and its shackle is a wide iron band, not a thin ring', () => {
  const c = createCreature({name: 'djinni', symbol: 38, color: 7});
  let width = 0, flat = 0;
  c.g.traverse(o => {if (!o.isMesh) return;
    if (o.material.flatShading) flat++;
    if (o.material.name === 'djinni-shackle') {o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; width = Math.max(width, b.max.x - b.min.x);}});
  assert(width >= .09, 'shackle band is wider than the old 0.072 ring: ' + width);
  assert(flat >= 6, 'torso and arms use flat shading');
});
