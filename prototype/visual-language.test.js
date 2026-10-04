import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ELEMENTS, elementColor, elementMotion, elementNames, colorDistance} from './visual-language.js';
import {WAND_AURAS} from './wand-auras.js';

const MOTIONS = new Set(['rise', 'fall', 'drift', 'orbit', 'sparkle', 'pulse', 'smoke', 'crackle']);

test('every element has a valid colour, a known motion and a note', () => {
  for (const name of elementNames()) {
    const e = ELEMENTS[name];
    assert.ok(Number.isInteger(e.color) && e.color > 0 && e.color <= 0xffffff, name);
    assert.ok(MOTIONS.has(e.motion), `${name}: ${e.motion}`);
    assert.ok(e.note.length > 5, name);
  }
  assert.equal(elementColor('nothing'), null);
  assert.equal(elementMotion('nothing'), null);
});

test('elements differ by colour, or by motion where the colours are close (cold and shock)', () => {
  const names = elementNames();
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = ELEMENTS[names[i]], b = ELEMENTS[names[j]];
    assert.ok(colorDistance(a.color, b.color) > 40 || a.motion !== b.motion, `${names[i]} vs ${names[j]}`);
  }
});

test('the wand auras agree with the palette for the elements they share', () => {
  assert.equal(WAND_AURAS.fire.color, elementColor('fire'));
  assert.equal(WAND_AURAS.cold.color, elementColor('cold'));
  assert.equal(WAND_AURAS.lightning.color, elementColor('shock'));
  assert.equal(WAND_AURAS['magic missile'].color, elementColor('missile'));
});

test('the guide documents every element', () => {
  const doc = readFileSync(new URL('./VISUAL-LANGUAGE.md', import.meta.url), 'utf8');
  for (const name of elementNames()) assert.ok(doc.includes(`\`${name}\``), name);
});
