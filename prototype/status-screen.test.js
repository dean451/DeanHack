import test from 'node:test';
import assert from 'node:assert/strict';
import {statusScreenClasses, applyStatusScreen} from './status-screen.js';

test('blindness darkens the screen and other words do not', () => {
  assert.deepEqual(statusScreenClasses(['Hungry', 'Blind']), ['status-blind']);
  assert.deepEqual(statusScreenClasses(['Hungry', 'Burdened']), []);
  assert.deepEqual(statusScreenClasses(['blind', 'BLIND']), ['status-blind']);
  assert.deepEqual(statusScreenClasses(undefined), []);
});

test('the overlay gains the class while blind and loses it on recovery', () => {
  const set = new Set();
  const el = {classList: {toggle: (c, on) => (on ? set.add(c) : set.delete(c))}};
  applyStatusScreen(el, ['Blind']);
  assert.ok(set.has('status-blind'));
  applyStatusScreen(el, []);
  assert.equal(set.size, 0);
});
