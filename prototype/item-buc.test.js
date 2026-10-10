import test from 'node:test';
import assert from 'node:assert/strict';
import {itemBuc, bucMark, itemFacts, itemHint} from './item-buc.js';

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

test('a known non-zero enchantment is told from the name', async () => {
  const {itemEnchant} = await import('./item-buc.js');
  assert.equal(itemEnchant('a blessed +2 dagger (weapon in hand)'), 'plus');
  assert.equal(itemEnchant('a rusty cursed -1 long sword'), 'minus');
  assert.equal(itemEnchant('an uncursed +0 ring mail'), null);
  assert.equal(itemEnchant('a wand of striking (0:5)'), null);
  assert.equal(itemEnchant('a dagger (weapon in hand +2)'), null);
  assert.equal(itemEnchant(''), null);
});

test('each enchantment has its own shape, and none has none', async () => {
  const {enchantMark} = await import('./item-buc.js');
  assert.notEqual(enchantMark('plus'), enchantMark('minus'));
  assert.ok(enchantMark('plus') && enchantMark('minus'));
  assert.equal(enchantMark(null), '');
});

test('hover hints spell out the marks', async () => {
  const {itemHint} = await import('./item-buc.js');
  assert.equal(itemHint('a blessed +2 dagger'), 'blessed, enchanted up');
  assert.equal(itemHint('a cursed -1 long sword'), 'cursed, enchanted down');
  assert.equal(itemHint('a cursed scroll of light'), 'cursed');
  assert.equal(itemHint('an uncursed +0 ring mail'), '');
});

test('hover hints also name wear, wield, charges and erosion', async () => {
  const {itemHint, itemFacts} = await import('./item-buc.js');
  assert.equal(itemHint('a blessed +1 long sword (weapon in hand)'), 'blessed, enchanted up, wielded');
  assert.equal(itemHint('an uncursed +0 ring mail (being worn)'), 'worn');
  assert.equal(itemHint('a wand of striking (0:5)'), '5 charges');
  assert.equal(itemHint('a rusty dagger'), 'rusty');
  assert.equal(itemHint('a very corroded poisoned dart (in quiver)'), 'very corroded, poisoned, quivered');
  assert.equal(itemHint('a ring of free action (on left hand)'), 'worn');
  assert.deepEqual(itemFacts('a plain dagger'), []);
});

test('hover hints name lit light sources, the alternate weapon, partly eaten food and diluted potions', async () => {
  const {itemHint} = await import('./item-buc.js');
  assert.equal(itemHint('a brass lantern (lit)'), 'lit');
  assert.equal(itemHint('3 wax candles (lit)'), 'lit');
  assert.equal(itemHint('a dagger (alternate weapon; not wielded)'), 'alternate weapon');
  assert.equal(itemHint('a partly eaten food ration'), 'partly eaten');
  assert.equal(itemHint('a diluted potion of healing'), 'diluted');
  assert.equal(itemHint('an unlit brass lantern'), '');
});

test('hover hints give shop prices and chained or embedded items', async () => {
  const {itemHint} = await import('./item-buc.js');
  assert.equal(itemHint('a cursed dagger (unpaid, 4 zorkmids)'), 'cursed, unpaid 4zm');
  assert.equal(itemHint('a dagger (for sale, 1 zorkmid)'), 'for sale 1zm');
  assert.equal(itemHint('a heavy iron ball (chained to you)'), 'chained to you');
  assert.equal(itemHint('a dagger'), '');
});

test('hover hints count a candelabrum\'s candles', async () => {
  const {itemHint} = await import('./item-buc.js');
  assert.equal(itemHint('a candelabrum (no candles attached)'), 'no candles');
  assert.equal(itemHint('the Candelabrum of Invocation (7 candles attached, lit)'), 'lit, 7 candles');
  assert.equal(itemHint('a candelabrum (1 candle attached)'), '1 candle');
});

test('a partly used candle or lamp says so in the hover', () => {
  assert.deepEqual(itemFacts('a partly used tallow candle (lit)'), ['lit', 'partly used']);
  assert.equal(itemHint('a tallow candle'), '');
});

test('an empty tin and an egg you laid say so in the hover', () => {
  assert.deepEqual(itemFacts('an empty tin'), ['empty']);
  assert.deepEqual(itemFacts('an egg (laid by you)'), ['laid by you']);
  assert.deepEqual(itemFacts('a tin of spinach'), []);
});
