import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 64, color: 7}).g.scale.y;

test('quest leaders of level 20 stand over a plain human', () => {
  for(const n of ['king arthur', 'lord sato', 'shan lai ching', 'grand master', 'master kung', 'neferet the green', 'master of thieves', 'orion', 'shaman karnov', 'robert the lifer', 'twoflower']){
    assert(scale(n) >= scale('human') * 1.1, n);
  }
});

test('the elven quest leaders have their own elf model, larger than the high-elf', () => {
  for(const n of ['earendil', 'elwing']){
    assert(scale(n) > scale('high-elf'), n);
  }
});
