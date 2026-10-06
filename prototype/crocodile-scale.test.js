import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('the crocodile stands well above its hatchling', () => {
  const scale = name => createCreature({name, symbol: 58, color: 2}).g.scale.x;
  assert(scale('crocodile') >= 1.2 - 1e-6);
  assert(scale('crocodile') >= scale('baby crocodile') * 2);
});
