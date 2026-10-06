import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('mind flayers loom: both stand taller than a hero, the master tallest', () => {
  const f = createCreature({name: 'mind flayer', symbol: 104, color: 5}), m = createCreature({name: 'master mind flayer', symbol: 104, color: 5});
  assert(f.g.scale.x >= 1.1 && m.g.scale.x > f.g.scale.x + .05);
});
