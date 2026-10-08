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

test('confusion gets its own swaying class, once, beside blindness', () => {
  assert.deepEqual(statusScreenClasses(['Conf']), ['status-confused']);
  assert.deepEqual(statusScreenClasses(['Blind', 'Conf', 'Confused']), ['status-blind', 'status-confused']);
  const set = new Set();
  const el = {classList: {toggle: (c, on) => (on ? set.add(c) : set.delete(c))}};
  applyStatusScreen(el, ['Conf']);
  assert.ok(set.has('status-confused') && !set.has('status-blind'));
  applyStatusScreen(el, []);
  assert.equal(set.size, 0);
});

test('stunned gets its own jolting class, once, beside the others', () => {
  assert.deepEqual(statusScreenClasses(['Stun']), ['status-stunned']);
  assert.deepEqual(statusScreenClasses(['Stunned', 'Stun', 'Blind']), ['status-stunned', 'status-blind']);
  const set = new Set();
  const el = {classList: {toggle: (c, on) => (on ? set.add(c) : set.delete(c))}};
  applyStatusScreen(el, ['Stun']);
  assert.ok(set.has('status-stunned') && !set.has('status-confused'));
  applyStatusScreen(el, []);
  assert.equal(set.size, 0);
});
