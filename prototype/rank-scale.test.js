import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 100, color: 1}).g.scale.x;

test('the evil eye hangs larger than the floating eye', () => {
  assert(scale('evil eye') >= 1.1);
});

test('the uranium imp stands larger than the plain imp', () => {
  assert(scale('uranium imp') >= scale('imp') * 1.08);
});
