import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionGlyph} from './condition-glyph.js';

const WORDS = ['Satiated', 'Hungry', 'Weak', 'Fainting', 'Starved', 'Blind', 'Deaf', 'Conf', 'Stun', 'Hallu', 'FoodPois', 'Ill', 'Slime', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded', 'Lev', 'Fly', 'Ride'];

test('every known condition has a shape of its own cue, ignoring case', () => {
  assert.equal(conditionGlyph('HUNGRY'), conditionGlyph('hungry'));
  for (const w of WORDS) assert.notEqual(conditionGlyph(w), '·', w);
});

test('the burden levels grow one mark at a time, and hunger worsens from a sliver to a full disc', () => {
  const marks = ['Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'].map(w => conditionGlyph(w).length);
  assert.deepEqual(marks, [1, 2, 3, 4, 5]);
  assert.deepEqual(['Hungry', 'Weak', 'Fainting'].map(conditionGlyph), ['◔', '◑', '◕']);
});

test('an unknown word still gets a neutral mark', () => {
  assert.equal(conditionGlyph('Zorp'), '·');
});
