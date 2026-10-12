import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conditionTags, conditionTagsHtml} from './hud-conditions.js';

// Hunger is a mechanic again. A BRIDGE_GRAPHICS block in src/eat.c used to reset nutrition to 900
// on every recalculation ("keep visual playtesting fed"), so nobody ever got hungry and food did
// not matter. The engine runs its normal hunger; the bridge reports Hungry; the HUD shows it.
test('the engine no longer tops nutrition back up for the bridge build', () => {
  const eat = readFileSync(new URL('../src/eat.c', import.meta.url), 'utf8');
  assert.doesNotMatch(eat, /BRIDGE_GRAPHICS[\s\S]{0,400}uhunger = 900/, 'no bridge-only hunger reset in newuhs()');
  assert.match(eat, /u\.uhunger--;\s*\/\* ordinary food consumption \*\//, 'the normal per-turn decrement is still there');
});

test('the bridge reports Hungry as a condition, before Weak', () => {
  const bridge = readFileSync(new URL('./engine/bridge.c', import.meta.url), 'utf8');
  const hungry = bridge.indexOf('u.uhs == HUNGRY) on[n++] = "Hungry"'), weak = bridge.indexOf('u.uhs >= WEAK');
  assert.ok(hungry > 0, 'Hungry is sent');
  assert.ok(hungry < weak, 'in the status line order: Hungry, then Weak');
});

test('the HUD shows HUNGRY as an amber tag, and WEAK as red', () => {
  assert.deepEqual(conditionTags(['Hungry']), ['HUNGRY']);
  assert.deepEqual(conditionTags(['Hungry', 'Weak']), ['HUNGRY', 'WEAK']);
  assert.match(conditionTagsHtml(['Hungry']), /class="hero-condition mild">HUNGRY</);
  assert.match(conditionTagsHtml(['Weak']), /class="hero-condition">WEAK</);
});
