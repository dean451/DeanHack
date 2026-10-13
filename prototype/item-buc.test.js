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
  assert.equal(itemHint('a wand of sleep (0:1)'), '1 charge');
  assert.equal(itemHint('a wand of digging (0:-1)'), 'cancelled');
  assert.equal(itemHint('a wand of fire (1:4)'), '4 charges, recharged');
  assert.equal(itemHint('a rusty dagger'), 'rusty');
  assert.equal(itemHint('a very rusty thoroughly corroded long sword'), 'very rusty, thoroughly corroded');
  assert.equal(itemHint('a very corroded poisoned dart (in quiver)'), 'very corroded, poisoned, quivered');
  assert.equal(itemHint('20 darts (at the ready)'), 'quivered');
  assert.equal(itemHint('a ring of free action (on left hand)'), 'worn, left hand');
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

test('a tethered aklys says it is wielded and tethered in the hover', () => {
  assert.deepEqual(itemFacts('an aklys (tethered weapon in hand)'), ['wielded, tethered']);
  assert.deepEqual(itemFacts('an aklys'), []);
});

test('hover hints tell off-hand and two-handed wielding and free shop items', () => {
  assert.deepEqual(itemFacts('a dagger (wielded in other hand)'), ['wielded, off hand']);
  assert.deepEqual(itemFacts('a two-handed sword (weapon in hands)'), ['wielded, two hands']);
  assert.deepEqual(itemFacts('a pick-axe (weapon in hand)'), ['wielded']);
  assert.deepEqual(itemFacts('a magic lamp (no charge)'), ['no charge']);
});

test('an applied leash or similar tool reads "in use" in the hover', () => {
  assert.deepEqual(itemFacts('a leash (in use)'), ['in use']);
  assert.equal(itemHint('a blessed leash (in use)'), 'blessed, in use');
  assert.equal(itemHint('a leash'), '');
});

test('armour being put on or taken off says so in the hover', () => {
  assert.deepEqual(itemFacts('a +1 plate mail (being donned)'), ['putting on']);
  assert.deepEqual(itemFacts('a +1 plate mail (being doffed)'), ['taking off']);
  assert.deepEqual(itemFacts('a +1 plate mail (being worn)'), ['worn']);
});

test('a container says how many items it holds, and weights show in the hover', () => {
  assert.deepEqual(itemFacts('a large box (containing 3 items)'), ['holds 3 items']);
  assert.deepEqual(itemFacts('a sack (containing 1 item)'), ['holds 1 item']);
  assert.deepEqual(itemFacts('a dagger (10 aum)'), ['10 aum']);
  assert.deepEqual(itemFacts('a sack'), []);
});

test('a container says whether it is locked or trapped in the hover', () => {
  assert.deepEqual(itemFacts('a large box (locked)'), ['locked']);
  assert.deepEqual(itemFacts('a chest (unlocked)'), ['unlocked']);
  assert.deepEqual(itemFacts('a chest (locked, trapped)'), ['locked', 'trapped']);
  assert.deepEqual(itemFacts('a chest (containing 2 items)'), ['holds 2 items']);
});

test('a container known to be empty says so in the hover, once', () => {
  assert.deepEqual(itemFacts('a sack (empty)'), ['empty']);
  assert.deepEqual(itemFacts('a chest (empty, locked)'), ['empty', 'locked']);
  assert.deepEqual(itemFacts('an empty tin (empty)'), ['empty']);
  assert.deepEqual(itemFacts('a sack'), []);
});

test('a wet towel says so in the hover', () => {
  assert.deepEqual(itemFacts('a wet towel'), ['wet']);
  assert.deepEqual(itemFacts('a blessed wet towel (in use)'), ['wet', 'in use']);
  assert.deepEqual(itemFacts('a towel'), []);
});

test('a shop stack priced each says so in the hover', () => {
  assert.deepEqual(itemFacts('3 daggers (for sale, 4 zorkmids each)'), ['for sale 4zm each']);
  assert.deepEqual(itemFacts('2 apples (unpaid, 7 zorkmids each)'), ['unpaid 7zm each']);
  assert.deepEqual(itemFacts('a dagger (for sale, 4 zorkmids)'), ['for sale 4zm']);
});

test('itemFacts says which hand a ring is on', () => {
  assert.deepEqual(itemFacts('a ring of regeneration (on right hand)'), ['worn, right hand']);
  assert.deepEqual(itemFacts('a ring of regeneration (on left finger)'), ['worn, left hand']);
});

test('a proofed item says which proofing it has in the hover', () => {
  assert.deepEqual(itemFacts('a rustproof +1 dagger'), ['rustproof']);
  assert.deepEqual(itemFacts('a fireproof cloak (being worn)'), ['fireproof', 'worn']);
  assert.deepEqual(itemFacts('a dagger'), []);
});

test('a thrown-weapon quiver and an attached leash read plainly in the hover', () => {
  assert.equal(itemHint('3 daggers (quivered)'), 'quivered');
  assert.equal(itemHint('a leash (attached to the little dog)'), 'leashed to the little dog');
});

test('a corpse drained by a vampire says so in the hover', () => {
  assert.deepEqual(itemFacts('a drained newt corpse'), ['drained']);
  assert.deepEqual(itemFacts('a partly drained human corpse'), ['partly drained']);
  assert.deepEqual(itemFacts('a newt corpse'), []);
});

test('an "empty" prefix reads empty for containers and spent lamps, not only tins', () => {
  assert.deepEqual(itemFacts('an empty chest'), ['empty']);
  assert.deepEqual(itemFacts('an empty brass lantern'), ['empty']);
  assert.deepEqual(itemFacts('an empty oil lamp (lit)'), ['lit', 'empty']);
  assert.deepEqual(itemFacts('a chest'), []);
});

test('armour in the pack reads its armour class in the hover', () => {
  assert.deepEqual(itemFacts('a +1 plate mail [8] (being worn)'), ['worn', 'AC 8']);
  assert.deepEqual(itemFacts('an elven mithril-coat [5]'), ['AC 5']);
  assert.deepEqual(itemFacts('a cloak [0]'), ['AC 0']);
  assert.deepEqual(itemFacts('a dagger'), []);
});
