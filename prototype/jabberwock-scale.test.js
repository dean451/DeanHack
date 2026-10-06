import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 74, color: 5}).g.scale.x;

test('the jabberwock stands 1.2 times larger and the vorpal one more', () => {
  assert(scale('jabberwock') >= 1.2);
  assert(scale('vorpal jabberwock') >= 1.3);
});
