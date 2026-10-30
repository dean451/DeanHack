import test from 'node:test';
import assert from 'node:assert/strict';
import {groundNotice, withPrices} from './ground-notice.js';

const more = {kind: 'more'};
test('every pile listing goes to the ground panel instead of a dialog', () => {
  for (const header of ['Things that are here:', 'Other things that are here:', 'Things that you feel here:'])
    assert.deepEqual(groundNotice(more, [header, 'a dagger', '2 arrows']), ['a dagger', '2 arrows'], header);
  assert.deepEqual(groundNotice(more, ['There is an altar to Tyr (lawful) here.', '', 'Things that are here:', 'a shuriken']), ['a shuriken'], 'after a feature line');
  assert.equal(groundNotice(more, ['Welcome to the dungeon']), null, 'other text windows stay');
  assert.equal(groundNotice({kind: 'key'}, ['Things that are here:', 'a dagger']), null);
});

test('shop prices from the look-here list stay on the per-frame ground list', () => {
  const priced = ['a dagger (4 zorkmids)', 'an uncursed scroll labeled FOO (1 zorkmid)', 'a dagger (4 zorkmids)', 'a rock'];
  assert.deepEqual(withPrices(['a dagger', 'a rock', 'an uncursed scroll labeled FOO', 'a dagger', 'a mace'], priced),
    ['a dagger (4 zorkmids)', 'a rock', 'an uncursed scroll labeled FOO (1 zorkmid)', 'a dagger (4 zorkmids)', 'a mace']);
  // an item already showing it is unpaid keeps its own text; no priced list leaves the names as they are
  assert.deepEqual(withPrices(['a dagger (unpaid, 4 zorkmids)'], priced), ['a dagger (unpaid, 4 zorkmids)']);
  const names = ['a dagger'];
  assert.equal(withPrices(names, null), names);
});
