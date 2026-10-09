import test from 'node:test';
import assert from 'node:assert/strict';
import {tumbleMessage, tumbleOffset, createStairTumble, TUMBLE_HEIGHT, TUMBLE_TIME, ARM_TIME, TWITCH_GAP, TWITCH_LEN, TWITCH_HEIGHT, TWITCH_GAP2} from './stair-tumble.js';

test('only the fall message arms a tumble', () => {
  assert.ok(tumbleMessage('You fall down the stairs.'));
  for (const t of ['You climb up the stairs.', 'You fall into a pit!', null, 3]) assert.ok(!tumbleMessage(t), String(t));
});

test('a fall, then two lower hops, in bounds and exactly at rest', () => {
  assert.equal(tumbleOffset(0), TUMBLE_HEIGHT);
  const hops = []; let prev = 0, rising = false, peak = 0;
  for (let t = 0; t <= TUMBLE_TIME + .3; t += .002) {
    const v = tumbleOffset(t);
    assert.ok(Number.isFinite(v) && v >= -1e-9 && v <= TUMBLE_HEIGHT + 1e-9, `t=${t}`);
    if (t > .05) {
      if (v > prev) { rising = true; peak = Math.max(peak, v); } else if (rising && v < prev) { hops.push(peak); rising = false; peak = 0; }
    }
    prev = v;
  }
  assert.ok(hops.length >= 2 && hops.every((h, i) => i === 0 || h < hops[i - 1]), `diminishing hops ${hops}`);
  assert.equal(tumbleOffset(TUMBLE_TIME + .5), 0);
  assert.equal(tumbleOffset(-1), 0);
  assert.equal(tumbleOffset(NaN), 0);
});

test('the controller tumbles on arrival and finishes at exactly zero', () => {
  const d = createStairTumble();
  assert.equal(d.update(.016), 0);
  assert.ok(!d.arrive(), 'not armed, no tumble');
  assert.ok(d.message('You fall down the stairs.'));
  assert.equal(d.update(.5), 0, 'armed hero stays level');
  assert.ok(d.arrive());
  let high = 0;
  for (let t = 0; t < TUMBLE_TIME + .2; t += 1 / 60) high = Math.max(high, d.update(1 / 60));
  assert.ok(high > .3);
  assert.equal(d.update(1 / 60), 0);
  assert.ok(!d.active);
});

test('an arming that never gets a level lapses, and clear resets', () => {
  const d = createStairTumble();
  d.message('You fall down the stairs.');
  for (let t = 0; t < ARM_TIME + .5; t += .05) d.update(.05);
  assert.ok(!d.active && !d.arrive());
  d.message('You fall down the stairs.'); d.clear();
  assert.ok(!d.active);
});

test('after the last bounce the hero lies still, then twitches once', () => {
  const end = TUMBLE_TIME - TWITCH_GAP - TWITCH_LEN - TWITCH_GAP2 - TWITCH_LEN;
  assert.ok(Math.abs(tumbleOffset(end + TWITCH_GAP / 2)) < 1e-9, 'still beat');
  const mid = tumbleOffset(end + TWITCH_GAP + TWITCH_LEN / 2);
  assert.ok(mid > 0 && mid <= TWITCH_HEIGHT + 1e-9, String(mid));
  assert.ok(tumbleOffset(TUMBLE_TIME) < 1e-9);
});

test('a second, fainter twitch follows the first, then the hero is exactly still', () => {
  const end = TUMBLE_TIME - 2 * TWITCH_LEN - TWITCH_GAP - TWITCH_GAP2;
  const first = tumbleOffset(end + TWITCH_GAP + TWITCH_LEN / 2);
  const second = tumbleOffset(end + TWITCH_GAP + TWITCH_LEN + TWITCH_GAP2 + TWITCH_LEN / 2);
  assert.ok(second > 0 && second < first, `${second} < ${first}`);
  assert.ok(Math.abs(tumbleOffset(end + TWITCH_GAP + TWITCH_LEN + TWITCH_GAP2 / 2)) < 1e-9, 'rests between');
  assert.ok(Math.abs(tumbleOffset(TUMBLE_TIME)) < 1e-9);
});
