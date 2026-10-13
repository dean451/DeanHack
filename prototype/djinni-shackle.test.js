import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const mats = name => {const c = createCreature({name, symbol: 38, color: 7}), set = new Set();
  c.g.traverse(o => {if (o.isMesh) set.add(o.material.name);}); return set;};

test('the djinni wears a locked iron shackle on one wrist; the sandestin does not', () => {
  assert(mats('djinni').has('djinni-shackle'));
  assert(!mats('sandestin').has('djinni-shackle'));
});
