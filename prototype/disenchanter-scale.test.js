import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 82, color: 0}).g.scale.y;

test('the disenchanter looms over the rust monster it is kin to', () => {
  assert(scale('disenchanter') >= scale('rust monster') * 1.25);
});
