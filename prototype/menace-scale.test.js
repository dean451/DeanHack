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

test('the skeleton stands over the plain zombie, and the aligned priest over the acolyte', () => {
  assert(scale('skeleton') >= 1.1);
  assert(scale('aligned priest') > 1);
});

test('the brown pudding spreads wider than a plain ooze', () => {
  assert(scale('brown pudding') >= scale('gray ooze') * 1.1);
});
