import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test("Devil's Snare stands larger than the lesser fungi and vines", () => {
  assert(createCreature({name: "Devil's Snare", symbol: 88, color: 2}).g.scale.x >= 1.25);
});
