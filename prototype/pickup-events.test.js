import test from 'node:test';
import assert from 'node:assert/strict';
import {createPickupNotes, squareOfKey, PICKUP_NOTE_LIFE} from './pickup-events.js';

test('a pickup note is spent once and only for its own square', () => {
  const notes = createPickupNotes();
  notes.note(4, 7, 1000);
  assert.equal(notes.take(5, 7, 1100), false);
  assert.equal(notes.take(4, 7, 1100), true);
  assert.equal(notes.take(4, 7, 1100), false);
});

test('a stale note does not count, so a monster taking an item later plays nothing', () => {
  const notes = createPickupNotes();
  notes.note(4, 7, 0);
  assert.equal(notes.take(4, 7, PICKUP_NOTE_LIFE + 1), false);
});

test('ground keys give back their square', () => {
  assert.equal(squareOfKey('12,34:!:'), '12,34');
});
