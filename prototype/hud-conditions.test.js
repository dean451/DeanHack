import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionTags, heroConditions, conditionTagsHtml} from './hud-conditions.js';

test('dangerous conditions become red capital tags, in order, without repeats', () => {
  assert.deepEqual(conditionTags(['Stun', 'Conf', 'FoodPois', 'Ill', 'Stone', 'Slime', 'Strngl', 'Weak']),
    ['STUN', 'CONF', 'ILL', 'STONE', 'SLIME', 'STRANGLED', 'WEAK']);
  assert.deepEqual(conditionTags(['Fainting', 'Fainted', 'Blind', 'Hallu', 'Lev', 'Legs', 'Trap', 'Held', 'Stressed']),
    ['FAINTING', 'FAINTED', 'BLIND', 'HALLU', 'LEV', 'LEGS', 'TRAPPED', 'HELD', 'STRESSED']);
  assert.deepEqual(conditionTags(['Hungry', 'Satiated', 'Elbereth']), ['HUNGRY'], 'Hungry is a warning tag; satiated and Elbereth are not alarms');
  assert.deepEqual(conditionTags(undefined), []);
});

test('the frame list wins; the status line is only the fallback', () => {
  const line = 'The Dungeons of Doom:25 $:1540 HP:43(80) Pw:29(29) AC:-31 Exp:12 T:10355 Stun';
  assert.deepEqual(heroConditions(['Conf'], line), ['Conf']);
  assert.deepEqual(heroConditions([], line), [], 'an empty list means nothing is wrong');
  assert.deepEqual(heroConditions(undefined, line), ['Stun']);
  assert.deepEqual(heroConditions(undefined, 'Dlvl:1 $:0 HP:1(1)'), []);
});

test('tags render as escaped spans', () => {
  assert.equal(conditionTagsHtml(['Stun', 'Conf']), '<span class="hero-condition"><i aria-hidden="true">✦</i> STUN</span><span class="hero-condition"><i aria-hidden="true">✱</i> CONF</span>');
  assert.equal(conditionTagsHtml([]), '');
});

test('each hero tag leads with its condition shape, so colour is never the only cue', async () => {
  const {conditionTagsHtml} = await import('./hud-conditions.js');
  const html = conditionTagsHtml(['Hungry', 'Stun', 'Held']);
  assert.match(html, /<i aria-hidden="true">◔<\/i> HUNGRY/);
  assert.match(html, /<i aria-hidden="true">✦<\/i> STUN/);
  assert.match(html, /<i aria-hidden="true">⊂⊃<\/i> HELD/);
  assert.doesNotMatch(html, /·/);
});
