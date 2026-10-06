import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 87, color: 1}).g.scale.x;

test('wraiths and barrow wights stand larger than a plain human, short of a Nazgul', () => {
  assert(scale('wraith') >= 1.2);
  assert(scale('barrow wight') >= 1.1);
  assert(scale('wraith') < scale('nazgul'));
});
