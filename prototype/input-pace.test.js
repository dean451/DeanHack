import test from 'node:test';
import assert from 'node:assert/strict';
import {createInputPace, PACE} from './input-pace.js';
import {liveSource} from './live-source.js';

test('commands typed ahead wait in order, up to the buffer, and none replaces another', () => {
  const p = createInputPace({buffer: 3});
  for (const k of [108, 104, 106, 107]) p.push(k);
  assert.equal(p.size, 3, 'the buffer holds three; the fourth is dropped rather than replacing one');
  assert.deepEqual([p.shift(), p.shift(), p.shift()], [108, 104, 106]);
  p.push(1);p.clear();assert.equal(p.size, 0);
});

test('while the player is ahead or typing fast, the scene hurries; otherwise it plays at full length', () => {
  const p = createInputPace();
  assert.equal(p.timeScale(1000), 1);assert.equal(p.holdCap(1000), Infinity);
  p.press(1000);p.press(1100); // two keys 100 ms apart
  assert.equal(p.timeScale(1150), PACE.hurryScale);assert.equal(p.holdCap(1150), PACE.hurryHoldMs);
  assert.equal(p.timeScale(1100 + PACE.fastGapMs * PACE.linger + 1), 1, 'a pause and it calms down');
  p.press(5000);assert.equal(p.timeScale(5010), 1, 'one key after a pause is not a hurry');
  p.push(108);assert.equal(p.timeScale(9000), PACE.hurryScale, 'a buffered command is always a hurry');
});

test('live.js buffers typed-ahead commands, empties the buffer on any other question, and hurries the scene', () => {
  const src = liveSource();
  assert.match(src, /inputPace\.press\(performance\.now\(\)\);if\(S\.pending\)reply\(code\);else if\(S\.pending===null\)inputPace\.push\(code\);/);
  assert.match(src, /if\(v\.kind==='command'&&inputPace\.size\)void reply\(inputPace\.shift\(\)\);else if\(v\.kind!=='command'\)inputPace\.clear\(\);/);
  assert.match(src, /const cap=inputPace\.holdCap\(performance\.now\(\)\),held=Math\.min\(wait,cap\);/);
  assert.match(src, /const pdt=dt\*inputPace\.timeScale\(performance\.now\(\)\);/);
  assert.doesNotMatch(src, /queuedCommand/, 'the one-key slot is gone');
});
