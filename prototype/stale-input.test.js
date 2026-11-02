import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isStale, guardStaleInput, STALE_INPUT_MS} from './stale-input.js';
import {liveSource} from './live-source.js';

test('an event handled long after it happened is stale; a fresh one, or one with no usable time, is not', () => {
  assert.equal(isStale({timeStamp: 1000}, 1000 + STALE_INPUT_MS + 1), true);
  assert.equal(isStale({timeStamp: 1000}, 1200), false);
  assert.equal(isStale({timeStamp: 0}, 99999), false, 'no time stamp: never dropped');
  assert.equal(isStale({timeStamp: 1e15}, 1000), false, 'a stamp on another clock: never dropped');
  assert.equal(isStale({}, 5000), false);
});

test('the guard swallows stale keys and clicks before the game sees them, only while live', () => {
  const listeners = {}, target = {addEventListener: (t, f, cap) => { assert.equal(cap, true, 'capture: before any other handler');(listeners[t] ||= []).push(f); }, removeEventListener() {}};
  let live = true, dropped = 0;const clock = () => 10000;guardStaleInput(target, () => live, () => dropped++, clock);
  assert.deepEqual(Object.keys(listeners).sort(), ['click', 'keydown', 'pointerdown', 'pointerup']);
  const ev = stamp => ({timeStamp: stamp, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; }, stopPropagation() {}});
  const old = ev(5000), fresh = ev(9900);
  listeners.keydown[0](old);listeners.keydown[0](fresh);
  assert.equal(old.stopped, true);assert.equal(fresh.stopped, false);assert.equal(dropped, 1);
  live = false;const later = ev(5000);listeners.keydown[0](later);
  assert.equal(later.stopped, false, 'on the splash nothing is dropped');
});

test('live.js guards its input', () => {
  assert.match(liveSource(), /guardStaleInput\(globalThis,\(\)=>active\);/);
});
