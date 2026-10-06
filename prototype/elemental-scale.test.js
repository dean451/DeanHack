import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 'E'.charCodeAt(0), color: 7}).g.scale.y;

test('elementals loom over a man, the earth elemental most of all', () => {
  for (const name of ['air elemental', 'fire elemental', 'water elemental']) assert(scale(name) >= 1.3, name);
  assert(scale('earth elemental') >= 1.5);
  assert(scale('stalker') >= 1.2);
});
