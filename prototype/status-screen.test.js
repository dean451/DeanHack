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

test('hallucination gets its own colour-shifting class, once, beside the others', () => {
  assert.deepEqual(statusScreenClasses(['Hallu']), ['status-hallu']);
  assert.deepEqual(statusScreenClasses(['Hallucinating', 'Hallu', 'Stun']), ['status-hallu', 'status-stunned']);
  const set = new Set();
  const el = {classList: {toggle: (c, on) => (on ? set.add(c) : set.delete(c))}};
  applyStatusScreen(el, ['Hallu']);
  assert.ok(set.has('status-hallu') && !set.has('status-confused'));
  applyStatusScreen(el, []);
  assert.equal(set.size, 0);
});

test('strangulation gets its own cinching class, once, beside the others', () => {
  assert.deepEqual(statusScreenClasses(['Strngl']), ['status-strangled']);
  assert.deepEqual(statusScreenClasses(['Strangled', 'Strngl', 'Hallu']), ['status-strangled', 'status-hallu']);
  const set = new Set();
  const el = {classList: {toggle: (c, on) => (on ? set.add(c) : set.delete(c))}};
  applyStatusScreen(el, ['Strngl']);
  assert.ok(set.has('status-strangled') && !set.has('status-blind'));
  applyStatusScreen(el, []);
  assert.equal(set.size, 0);
});

test('stoning gets its own creeping-grey class, once, beside the others', () => {
  assert.deepEqual(statusScreenClasses(['Stone']), ['status-stoned']);
  assert.deepEqual(statusScreenClasses(['Stoned', 'Stone', 'Strngl']), ['status-stoned', 'status-strangled']);
  const set = new Set();
  const el = {classList: {toggle: (c, on) => (on ? set.add(c) : set.delete(c))}};
  applyStatusScreen(el, ['Stone']);
  assert.ok(set.has('status-stoned') && !set.has('status-blind'));
  applyStatusScreen(el, []);
  assert.equal(set.size, 0);
});

test('sliming gets its own oozing-green class, once, beside the others', () => {
  assert.deepEqual(statusScreenClasses(['Slime']), ['status-slimed']);
  assert.deepEqual(statusScreenClasses(['Slimed', 'Slime', 'Stone']), ['status-slimed', 'status-stoned']);
  const set = new Set();
  const el = {classList: {toggle: (c, on) => (on ? set.add(c) : set.delete(c))}};
  applyStatusScreen(el, ['Slime']);
  assert.ok(set.has('status-slimed') && !set.has('status-stoned'));
  applyStatusScreen(el, []);
  assert.equal(set.size, 0);
});

test('food poisoning and deadly illness share a colour-draining sweat class, once, beside the others', () => {
  assert.deepEqual(statusScreenClasses(['FoodPois']), ['status-poisoned']);
  assert.deepEqual(statusScreenClasses(['Ill', 'FoodPois', 'Slime']), ['status-poisoned', 'status-slimed']);
  const set = new Set();
  const el = {classList: {toggle: (c, on) => (on ? set.add(c) : set.delete(c))}};
  applyStatusScreen(el, ['FoodPois']);
  assert.ok(set.has('status-poisoned') && !set.has('status-slimed'));
  applyStatusScreen(el, []);
  assert.equal(set.size, 0);
});
