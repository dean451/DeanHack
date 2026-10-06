import test from 'node:test';
import assert from 'node:assert/strict';
import {createMessageLog, addMessage, entryText, panelView, allLines, HISTORY_LIMIT, VISIBLE} from './message-log.js';

test('messages come back newest first, and the panel shows the newest apart from the earlier ones', () => {
  const log = createMessageLog();
  for (const m of ['one', 'two', 'three']) addMessage(log, m);
  assert.deepEqual(allLines(log), ['three', 'two', 'one']);
  assert.deepEqual(panelView(log), {line: 'three', earlier: ['two', 'one']});
});

test('an unbroken repeat folds into one counted entry; the same text later is a new entry', () => {
  const log = createMessageLog();
  addMessage(log, 'You miss.'); addMessage(log, 'You miss.'); addMessage(log, 'You miss.');
  assert.deepEqual(allLines(log), ['You miss. (x3)']);
  addMessage(log, 'The jackal bites!'); addMessage(log, 'You miss.');
  assert.deepEqual(allLines(log), ['You miss.', 'The jackal bites!', 'You miss. (x3)']);
});

test('a burst of messages in one turn is all kept and none of it is dropped from the history', () => {
  const log = createMessageLog();
  for (let i = 0; i < 40; i++) addMessage(log, `message ${i}`);
  assert.equal(allLines(log).length, 40);
  assert.equal(panelView(log).earlier.length, VISIBLE);
  assert.equal(panelView(log).line, 'message 39');
});

test('the history is capped and drops only the oldest', () => {
  const log = createMessageLog();
  for (let i = 0; i < HISTORY_LIMIT + 25; i++) addMessage(log, `m${i}`);
  const lines = allLines(log);
  assert.equal(lines.length, HISTORY_LIMIT);
  assert.equal(lines[0], `m${HISTORY_LIMIT + 24}`);
  assert.equal(lines.at(-1), 'm25');
});

test('blank and non-string input is ignored or made into text, never an empty entry', () => {
  const log = createMessageLog();
  assert.equal(addMessage(log, ''), null);
  assert.equal(addMessage(log, '   '), null);
  assert.equal(addMessage(log, undefined), null);
  assert.equal(entryText(addMessage(log, 42)), '42');
  assert.deepEqual(panelView(createMessageLog()), {line: '', earlier: []});
});
