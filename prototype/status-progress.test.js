import test from 'node:test';
import assert from 'node:assert/strict';
import {createStatusProgress, worstProgress} from './status-progress.js';

test('a countdown fills turn by turn and caps at 1', () => {
  const sp = createStatusProgress();
  const seen = [10, 11, 12, 13, 14, 15, 16].map(t => sp.update(['Stone'], t).stone);
  assert.ok(seen[0] > 0 && seen[0] < 1);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1]);
  assert.equal(seen.at(-1), 1);
});

test('a cured condition forgets its start, so the next one begins at the bottom', () => {
  const sp = createStatusProgress();
  sp.update(['Slime'], 1); sp.update(['Slime'], 6);
  assert.deepEqual(sp.update(['Hungry'], 7), {});
  assert.ok(sp.update(['Slime'], 20).slime < 0.2);
});

test('only deadly words count, and worstProgress picks the furthest', () => {
  const sp = createStatusProgress();
  assert.deepEqual(sp.update(['Blind', 'Conf'], 3), {});
  const p = sp.update(['Strngl', 'Ill'], 3);
  assert.ok(p.strngl > p.ill);
  assert.equal(worstProgress(p), p.strngl);
  assert.equal(worstProgress({}), 0);
});

test('the bridge\'s turns left win over turn counting: fixed lengths for stone, slime and strangling, the longest seen for sickness', () => {
  const sp = createStatusProgress();
  assert.deepEqual(sp.update(['Stone'], 100, {stone: 5}), {stone: 0});
  assert.deepEqual(sp.update(['Stone'], 101, {stone: 3}), {stone: 0.4});
  assert.deepEqual(sp.update(['Stone'], 102, {stone: 0}), {stone: 1});
  assert.deepEqual(sp.update(['Strngl'], 1, {strngl: 6}), {strngl: 0});
  assert.deepEqual(sp.update(['Strngl'], 2, {strngl: 3}), {strngl: 0.5});
  assert.deepEqual(sp.update(['Slime'], 1, {slime: 10}), {slime: 0});
  const a = sp.update(['Ill'], 1, {sick: 24}), b = sp.update(['Ill'], 2, {sick: 12}), c = sp.update(['Ill'], 3, {sick: 0});
  assert.equal(a.ill, 0); assert.equal(b.ill, 0.5); assert.equal(c.ill, 1);
  sp.update([], 4, {});
  assert.deepEqual(sp.update(['FoodPois'], 5, {sick: 8}), {foodpois: 0}, 'a new sickness starts its own length');
  assert.deepEqual(sp.update(['FoodPois'], 6, {sick: 6}), {foodpois: 0.25});
  const fallback = sp.update(['Stone'], 10, null);
  assert.equal(fallback.stone, 0.2, 'without the bridge field it still counts turns');
  assert.deepEqual(sp.update(['Stone'], 11, {}), {stone: 0.4}, 'an empty object means nothing is counting down on the engine side, so turns are counted');
});

test('the bridge sends the deadly countdowns next to the condition words', async () => {
  const {readFileSync} = await import('node:fs');
  const bridge = readFileSync(new URL('./engine/bridge.c', import.meta.url), 'utf8');
  // in the C source the JSON quotes are escaped: printf(",\\"countdowns\\":{")
  const at = bridge.indexOf('\\"countdowns\\":{');
  assert.ok(at > 0, 'the field is printed');
  const block = bridge.slice(at, at + 900);
  for (const k of ['stone', 'slime', 'strngl', 'sick']) assert.ok(block.includes(`\\"${k}\\":%ld`), `${k} is sent`);
  assert.ok(block.includes('(Stoned & TIMEOUT)') && block.includes('(Sick & TIMEOUT)'), 'the property timeouts, not a guess');
  assert.ok(at > bridge.indexOf('\\"conditions\\":['), 'after the words');
});
