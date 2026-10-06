import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 100, color: 1}).g.scale.x;

test('the hell hound and winter wolf loom over the plain wolf', () => {
  assert(scale('hell hound') >= scale('wolf') * 1.1);
  assert(scale('winter wolf') >= scale('wolf') * 1.15);
});
