import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 58, color: 2}).g.scale.x;

test('the giant turtle is a hulking, armoured slab, larger than before', () => {
  assert(scale('giant turtle') >= 1.2);
});
