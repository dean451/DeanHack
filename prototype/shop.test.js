import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The guaranteed level-2 general store is a regular store with a few likely pieces of ordinary
// kit. The old ascension-kit stocking stays in the source behind DEANHACK_ASCENSION_SHOP, off.
const src = readFileSync(new URL('../src/shknam.c', import.meta.url), 'utf8');

test('the ascension-kit shop is kept but switched off by default', () => {
  assert.match(src, /#define DEANHACK_ASCENSION_SHOP 0/);
  assert.match(src, /#if DEANHACK_ASCENSION_SHOP\s*\n\/\* one guaranteed copy of each of these/, 'the curated list is compiled only when switched on');
  assert.match(src, /CHROMATIC_DRAGON_SCALE_MAIL/, 'the old list is still there for later');
  assert.match(src, /DEANHACK_ASCENSION_SHOP && mkshop_curated_loot\s*&& curated_loot_rejected/, 'the random-stock filter is part of the ascension stocking only');
});

test('the regular store adds ordinary essentials, never forced enchantment or blessing', () => {
  const block = src.slice(src.indexOf('essential_items[] = {'), src.indexOf('place_essential_items('));
  for (const item of ['FOOD_RATION', 'OIL_LAMP', 'SACK', 'SCR_IDENTIFY', 'PICK_AXE', 'UNICORN_HORN', 'POT_HEALING'])
    assert.match(block, new RegExp(`\\b${item}\\b`), item);
  for (const bad of ['EXCALIBUR', 'WAN_DEATH', 'SPEED_BOOTS', 'BAG_OF_HOLDING', 'CANDELABRUM', 'MAGIC_LAMP'])
    assert.doesNotMatch(block, new RegExp(bad), `${bad} is not in the regular store`);
  const placer = src.slice(src.indexOf('place_essential_items(struct'), src.indexOf('place_essential_items(struct') + 1500);
  assert.doesNotMatch(placer, /spe = |blessed = 1|oerodeproof = 1/, 'ordinary items');
  assert.match(placer, /otmp->cursed = 0/, 'but never cursed');
  assert.match(src, /#else\s*\n\s*place_essential_items\(sroom, rmno, sh\);/, 'placed when the ascension shop is off');
});
