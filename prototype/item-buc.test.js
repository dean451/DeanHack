import test from 'node:test';
import assert from 'node:assert/strict';
import {itemBuc, bucMark} from './item-buc.js';

test('blessed and cursed items are told from the name', () => {
  assert.equal(itemBuc('a blessed +1 dagger (weapon in hand)'), 'blessed');
  assert.equal(itemBuc('2 cursed potions of sleeping'), 'cursed');
  assert.equal(itemBuc('the cursed Bell of Opening'), 'cursed');
  assert.equal(itemBuc('a rusty cursed -1 long sword'), 'cursed');
});

test('uncursed and unknown items stay bare', () => {
  assert.equal(itemBuc('an uncursed scroll of light'), null);
  assert.equal(itemBuc('a scroll labeled FOOBIE'), null);
  assert.equal(itemBuc('a potion of cursed water'), null);
  assert.equal(itemBuc(''), null);
});

test('each state has its own shape, and none has none', () => {
  assert.notEqual(bucMark('blessed'), bucMark('cursed'));
  assert.ok(bucMark('blessed') && bucMark('cursed'));
  assert.equal(bucMark(null), '');
});
