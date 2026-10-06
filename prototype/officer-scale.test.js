import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 64, color: 7}).g.scale.y;

test('elf lords and the Elvenking stand over the woodland-elf', () => {
  assert(scale('elf-lord') > scale('woodland-elf'));
  assert(scale('elvenking') > scale('elf-lord'));
});

test('soldier officers are built larger than the common soldier, the captain most', () => {
  assert(scale('lieutenant') > scale('soldier'));
  assert(scale('captain') > scale('lieutenant'));
});

test('the high clergy stand over the aligned priest', () => {
  assert(scale('high priest') > scale('aligned priest'));
  assert(scale('arch priest') > scale('high priest'));
});
