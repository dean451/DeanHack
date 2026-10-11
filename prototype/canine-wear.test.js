import test from 'node:test';
import assert from 'node:assert/strict';
import {canineWear} from './canine.js';
import {createCreature} from './creatures.js';

test('wargs and werewolves carry a bitten ear and a muzzle scar; the plain wolf stays clean', () => {
  for (const n of ['warg', 'werewolf']) assert.deepEqual(canineWear(n), {torn: true, scar: true}, n);
  assert.deepEqual(canineWear('wolf'), {torn: false, scar: false});
  for (const n of ['warg', 'werewolf']) {
    const a = createCreature({name: n, symbol: 100, color: 3});
    assert.equal(a.legs.length, 4, n);
  }
});
