import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('the minotaur stands a head above the ogres', () => {
  const m = createCreature({name: 'minotaur', symbol: 72, color: 1}).g.scale.x;
  assert(m >= 1.35);
});
