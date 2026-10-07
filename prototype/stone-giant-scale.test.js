import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 72, color: 0}).g.scale.y;

test('the stone giant stands larger than the plain giant, near the hill giant', () => {
  assert(scale('stone giant') > scale('giant'));
  assert(scale('stone giant') >= scale('hill giant'));
});
