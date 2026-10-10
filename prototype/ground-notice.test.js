import test from 'node:test';
import assert from 'node:assert/strict';
import {groundNotice} from './ground-notice.js';

const more = {kind: 'more'};
test('every pile listing goes to the ground panel instead of a dialog', () => {
  for (const header of ['Things that are here:', 'Other things that are here:', 'Things that you feel here:'])
    assert.deepEqual(groundNotice(more, [header, 'a dagger', '2 arrows']), ['a dagger', '2 arrows'], header);
  assert.deepEqual(groundNotice(more, ['There is an altar to Tyr (lawful) here.', '', 'Things that are here:', 'a shuriken']), ['a shuriken'], 'after a feature line');
  assert.equal(groundNotice(more, ['Welcome to the dungeon']), null, 'other text windows stay');
  assert.equal(groundNotice({kind: 'key'}, ['Things that are here:', 'a dagger']), null);
});
