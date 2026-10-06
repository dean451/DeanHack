import test from 'node:test';
import assert from 'node:assert/strict';
import {createHistoryPanel, TONE_MARKS} from './message-history.js';

// A just-enough DOM: elements with children, text, a class and attributes.
const doc = {createElement: tag => {
  const el = {tag, children: [], attrs: {}, hidden: false, className: '', textContent: '', scrollTop: 5,
    setAttribute(k, v) { this.attrs[k] = v; },
    replaceChildren(...kids) { this.children = kids; }};
  return el;
}};

test('the panel starts closed, opens with the rows newest first, and closes again', () => {
  const rows = [{text: 'The newt bites!', tone: 'damage'}, {text: 'You see here a dagger.', tone: 'pickup'}];
  const panel = createHistoryPanel(doc, () => rows);
  assert.equal(panel.isOpen(), false);
  panel.toggle();
  assert.equal(panel.isOpen(), true);
  const [head, ...lines] = panel.el.children;
  assert.match(head.textContent, /MESSAGE HISTORY/);
  assert.deepEqual(lines.map(l => [l.textContent, l.className]), [
    ['The newt bites!', 'msg msg-damage'], ['You see here a dagger.', 'msg msg-pickup']]);
  assert.equal(panel.el.scrollTop, 0, 'opens at the newest message');
  panel.toggle();
  assert.equal(panel.isOpen(), false);
});

test('refresh redraws only while open, so new messages appear without reopening', () => {
  let rows = [{text: 'one', tone: 'plain'}];
  const panel = createHistoryPanel(doc, () => rows);
  panel.refresh();
  assert.equal(panel.el.children.length, 0, 'closed panel is not drawn');
  panel.show();
  rows = [{text: 'two', tone: 'plain'}, ...rows];
  panel.refresh();
  assert.equal(panel.el.children.length, 3);
});

test('an empty history says so, and every tone has a marker that is not colour', () => {
  const panel = createHistoryPanel(doc, () => []);
  panel.show();
  assert.match(panel.el.children[0].textContent, /No messages yet/);
  for (const tone of ['damage', 'magic', 'pickup', 'warning']) assert.ok(TONE_MARKS[tone], tone);
  assert.equal(new Set(Object.values(TONE_MARKS)).size, 5, 'markers are all different');
});
