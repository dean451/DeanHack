import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 100, color: 1}).g.scale.x;

test('Death towers over his fellow Riders, and every Rider over a wraith', () => {
  assert(scale('Death') >= 1.3);
  assert(scale('Death') > scale('Pestilence'));
  for (const rider of ['Famine', 'Pestilence', 'War']) assert(scale(rider) >= 1.2, rider);
});

test('the weeping angel looms larger than a plain stone statue', () => {
  assert(scale('weeping angel') >= 1.15);
  assert(scale('weeping archangel') > scale('weeping angel'));
});
