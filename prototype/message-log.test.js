import test from 'node:test';
import assert from 'node:assert/strict';
import {createMessageLog, addMessage, entryText, panelView, allLines, allRows, messageTone, HISTORY_LIMIT, VISIBLE} from './message-log.js';

test('messages come back newest first, and the panel shows the newest apart from the earlier ones', () => {
  const log = createMessageLog();
  for (const m of ['one', 'two', 'three']) addMessage(log, m);
  assert.deepEqual(allLines(log), ['three', 'two', 'one']);
  const view = panelView(log);
  assert.equal(view.line, 'three'); assert.deepEqual(view.earlier, ['two', 'one']);
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
  const empty = panelView(createMessageLog());
  assert.equal(empty.line, ''); assert.deepEqual(empty.earlier, []);
});

test('messages are told apart by tone: warnings first, then damage, magic and pickups', () => {
  assert.equal(messageTone('The jackal bites!'), 'damage');
  assert.equal(messageTone('You hit the newt.'), 'damage');
  assert.equal(messageTone('You are beginning to feel hungry.'), 'warning');
  assert.equal(messageTone('You faint from lack of food.'), 'warning');
  assert.equal(messageTone('You feel weak from hunger.'), 'warning');
  assert.equal(messageTone('The jackal bites! You are confused.'), 'warning');
  assert.equal(messageTone('The wand glows and fades.'), 'magic');
  assert.equal(messageTone('a - an uncursed +1 long sword (weapon in hand).'), 'pickup');
  assert.equal(messageTone('You see here a pick-axe.'), 'pickup');
  assert.equal(messageTone('The fountain murmurs.'), 'plain');
  assert.equal(messageTone('Velkommen Wanderer, the human Valkyrie, welcome back to UnNetHack!'), 'plain');
  assert.equal(messageTone(undefined), 'plain');
});

test('rows and the panel view carry each message\'s tone', () => {
  const log = createMessageLog();
  addMessage(log, 'You see here a dagger.'); addMessage(log, 'The newt bites!');
  assert.deepEqual(allRows(log), [{text: 'The newt bites!', tone: 'damage'}, {text: 'You see here a dagger.', tone: 'pickup'}]);
  const view = panelView(log);
  assert.equal(view.lineTone, 'damage'); assert.deepEqual(view.earlierTones, ['pickup']);
});
