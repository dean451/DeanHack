import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 100, color: 1}).g.scale.x;

test('the green slime and ochre jelly spread wider than a plain ooze', () => {
  assert(scale('green slime') >= scale('gray ooze') * 1.2);
  assert(scale('ochre jelly') >= scale('gray ooze') * 1.2);
});

test('the cobra rears larger than the common snake', () => {
  assert(scale('cobra') >= scale('snake') * 1.15);
});

test('the blue slime spreads like the green slime', () => {
  assert(scale('blue slime') >= scale('gray ooze') * 1.2);
});
