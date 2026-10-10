import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionTags, heroConditions, conditionTagsHtml} from './hud-conditions.js';

test('dangerous conditions become red capital tags, in order, without repeats', () => {
  assert.deepEqual(conditionTags(['Stun', 'Conf', 'FoodPois', 'Ill', 'Stone', 'Slime', 'Strngl', 'Weak']),
    ['STUN', 'CONF', 'ILL', 'STONE', 'SLIME', 'STRANGLED', 'WEAK']);
  assert.deepEqual(conditionTags(['Fainting', 'Fainted', 'Blind', 'Hallu', 'Lev', 'Legs', 'Trap', 'Held', 'Stressed']),
    ['FAINTING', 'FAINTED', 'BLIND', 'HALLU', 'LEV', 'LEGS', 'TRAPPED', 'HELD', 'STRESSED']);
  assert.deepEqual(conditionTags(['Hungry', 'Satiated', 'Elbereth']), [], 'harmless words are not alarms');
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
  assert.equal(conditionTagsHtml(['Stun', 'Conf']), '<span class="hero-condition">STUN</span><span class="hero-condition">CONF</span>');
  assert.equal(conditionTagsHtml([]), '');
});
