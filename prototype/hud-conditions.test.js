import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionTags, heroConditions, conditionTagsHtml} from './hud-conditions.js';

test('dangerous conditions become red capital tags, in order, without repeats', () => {
  assert.deepEqual(conditionTags(['Stun', 'Conf', 'FoodPois', 'Ill', 'Stone', 'Slime', 'Strngl', 'Weak']),
    ['STUN', 'CONF', 'ILL', 'STONE', 'SLIME', 'STRANGLED', 'WEAK']);
  assert.deepEqual(conditionTags(['Fainting', 'Fainted', 'Blind', 'Hallu', 'Lev', 'Legs', 'Trap', 'Held', 'Stressed']),
    ['FAINTING', 'FAINTED', 'BLIND', 'HALLU', 'LEV', 'LEGS', 'TRAPPED', 'HELD', 'STRESSED']);
  // Satiated came back on the user's word (2026-10-17): eating past it can choke, so it is an amber warning like Hungry.
  assert.deepEqual(conditionTags(['Hungry', 'Satiated', 'Elbereth']), ['HUNGRY', 'SATIATED'], 'Hungry and Satiated are warning tags; Elbereth is not');
  assert.deepEqual(conditionTags(undefined), []);
});

test('deafness is an amber warning tag with its own shape', () => {
  assert.deepEqual(conditionTags(['Deaf', 'Stun']), ['DEAF', 'STUN']);
  assert.match(conditionTagsHtml(['Deaf']), /class="hero-condition mild"><i aria-hidden="true">≈<\/i> DEAF/);
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

test('Satiated shows as an amber tag, from the frame list or, on an older bridge, the status line', async () => {
  const {heroConditions, conditionTagsHtml} = await import('./hud-conditions.js');
  assert.match(conditionTagsHtml(['Satiated']), /class="hero-condition mild"[^>]*>.*SATIATED/);
  assert.deepEqual(heroConditions(['Stun'], 'Dlvl:3 $:0 HP:10(10) T:120 Satiated Stun'), ['Stun', 'Satiated']);
  assert.deepEqual(heroConditions(['Satiated'], 'T:5 Satiated'), ['Satiated'], 'no repeat');
  assert.deepEqual(heroConditions([], 'T:5'), []);
  const bridge = (await import('node:fs')).readFileSync(new URL('./engine/bridge.c', import.meta.url), 'utf8');
  assert.match(bridge, /if \(u\.uhs == SATIATED\) on\[n\+\+\] = "Satiated";/);
});
