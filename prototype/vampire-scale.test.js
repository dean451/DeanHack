import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 86, color: 1}).g.scale.x;

test('vampire lords, mages and Vlad loom over the common vampire', () => {
  assert(scale('vampire lord') >= scale('vampire') * 1.1);
  assert(scale('vampire mage') >= scale('vampire') * 1.08);
  assert(scale('vlad the impaler') > scale('vampire lord'));
});
