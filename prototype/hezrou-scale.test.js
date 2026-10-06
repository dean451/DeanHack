import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 38, color: 2}).g.scale.x;

test('the hezrou looms over an ordinary demon-sized foe', () => {
  assert(scale('hezrou') >= 1.25);
  assert(scale('hezrou') > scale('vrock'));
});
