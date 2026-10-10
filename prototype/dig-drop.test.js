import test from 'node:test';
import assert from 'node:assert/strict';
import {holeMessage, sinkOffset, arriveOffset, createDigDrop, HANG, SINK, SINK_DEPTH, GIVE_UP, RISE, ARRIVE_HEIGHT, ARRIVE_GRAVITY, ARRIVE_TIME, SETTLE_GAP, SETTLE_LEN, SETTLE_HEIGHT, airborneStatus, hoverOffset, trapdoorMessage, escapeMessage, TRAPDOOR_HANG, HOVER_TIME, HOVER_LIFT} from './dig-drop.js';

test('only the hole message starts a drop', () => {
  assert.ok(holeMessage('You dig a hole through the floor.'));
  for (const t of ['You dig a pit in the floor.', 'You hit the rock with all your might.', null, 4]) assert.ok(!holeMessage(t), String(t));
});

test('the hero hangs on the edge, then sinks faster and faster, bounded', () => {
  assert.equal(sinkOffset(0), 0);
  assert.equal(sinkOffset(HANG), 0);
  const a = sinkOffset(HANG + SINK * .5), b = sinkOffset(HANG + SINK);
  assert.ok(a < 0 && b <= a && Math.abs(b - a) > Math.abs(a), 'accelerating');
  for (let t = 0; t < 6; t += .01) { const v = sinkOffset(t); assert.ok(Number.isFinite(v) && v <= 0 && v >= -SINK_DEPTH - 1e-9, `t=${t}`); }
  assert.equal(sinkOffset(GIVE_UP + RISE), 0, 'hauled back up if no level comes');
  assert.equal(sinkOffset(NaN), 0);
});

test('arriving: a fall from above, one low dead bounce, then exactly at rest', () => {
  assert.equal(arriveOffset(0), ARRIVE_HEIGHT);
  const fall = Math.sqrt(2 * ARRIVE_HEIGHT / ARRIVE_GRAVITY);
  let peak = 0;
  for (let t = 0; t <= ARRIVE_TIME + .2; t += .005) {
    const v = arriveOffset(t);
    assert.ok(Number.isFinite(v) && v >= -1e-9 && v <= ARRIVE_HEIGHT + 1e-9, `t=${t} ${v}`);
    if (t > fall + .01) peak = Math.max(peak, v);
  }
  assert.ok(peak > .03 && peak < .3, `a small bounce, peak ${peak}`);
  assert.equal(arriveOffset(ARRIVE_TIME + .5), 0);
  assert.equal(arriveOffset(-1), 0);
});

test('the controller sinks, lands on arrival and finishes at exactly zero', () => {
  const d = createDigDrop();
  assert.equal(d.update(.016), 0);
  assert.ok(!d.arrive(), 'no drop, no fall-in');
  assert.ok(d.message('You dig a hole through the floor.'));
  let low = 0;
  for (let t = 0; t < HANG + SINK + .1; t += 1 / 60) low = Math.min(low, d.update(1 / 60));
  assert.ok(low < -.5 && d.active);
  assert.ok(d.arrive());
  assert.ok(d.update(1 / 60) > ARRIVE_HEIGHT - .1, 'starts high');
  for (let t = 0; t < ARRIVE_TIME + .2; t += 1 / 60) d.update(1 / 60);
  assert.ok(!d.active);
  assert.equal(d.update(1 / 60), 0);
});

test('with no new level the controller gives up and clear cancels at once', () => {
  const d = createDigDrop();
  d.message('You dig a hole through the floor.');
  for (let t = 0; t < GIVE_UP + RISE + .3; t += 1 / 60) d.update(1 / 60);
  assert.ok(!d.active);
  d.message('You dig a hole through the floor.');
  d.update(1);
  d.clear();
  assert.equal(d.update(1 / 60), 0);
  assert.ok(!d.arrive());
});

test('a levitating or flying hero hovers over the hole instead of dropping', () => {
  assert.ok(airborneStatus('Dlvl:3 $:0 HP:12(12) Pw:2(2) AC:7 Exp:1 T:40 Lev'));
  assert.ok(airborneStatus('Dlvl:3 $:0 HP:12(12) Pw:2(2) AC:7 Exp:1 T:40 Burdened Fly'));
  assert.ok(!airborneStatus('Dlvl:3 $:0 HP:12(12) Pw:2(2) AC:7 Exp:1 T:40 Hungry'));
  assert.ok(!airborneStatus(null));
  const d = createDigDrop();
  assert.ok(d.message('You dig a hole through the floor.', true));
  let peak = 0;
  for (let i = 0; i < 40; i++) { const v = d.update(.05); assert.ok(v >= 0 && v <= HOVER_LIFT + 1e-9); peak = Math.max(peak, v); }
  assert.ok(peak > 0, 'lifts');
  for (let i = 0; i < 20; i++) d.update(.05);
  assert.equal(d.update(.05), 0);
  assert.ok(!d.active);
  assert.equal(hoverOffset(0), 0);
  assert.equal(hoverOffset(HOVER_TIME), 0);
  assert.ok(!d.arrive(), 'no fall-in after hovering');
});

test('a trap door drops the hero almost at once, and returns exactly to rest', () => {
  assert.ok(trapdoorMessage('A trap door opens up under you!') && trapdoorMessage("There's a gaping hole under you!"));
  for (const t of ['You dig a hole through the floor.', 'You escape a trap door.', null]) assert.ok(!trapdoorMessage(t), String(t));
  assert.ok(sinkOffset(TRAPDOOR_HANG + .1, TRAPDOOR_HANG) < sinkOffset(TRAPDOOR_HANG + .1), 'earlier than a dug hole');
  const d = createDigDrop();
  assert.ok(d.message('A trap door opens up under you!'));
  assert.equal(d.update(TRAPDOOR_HANG * .5), 0);
  let low = 0;
  for (let i = 0; i < 80; i++) { const v = d.update(.05); assert.ok(v <= 0 && v >= -SINK_DEPTH - 1e-9); low = Math.min(low, v); }
  assert.ok(low < -.5);
  assert.equal(d.update(.05), 0); assert.ok(!d.active);
  assert.ok(d.message('You dig a hole through the floor.') && d.update(TRAPDOOR_HANG + .1) === 0, 'a dug hole still hangs');
});

test('a trap door the hero escapes (levitating, or "You don\'t fall in.") never drops them', () => {
  assert.ok(escapeMessage("You don't fall in."));
  assert.ok(escapeMessage('You escape a trap door.'));
  assert.ok(!escapeMessage('You fall through...'));
  const d = createDigDrop();
  assert.ok(d.message('A trap door opens up under you!'));
  let y = 0, low = 0;
  for (let i = 0; i < 10; i++) { y = d.update(.05); low = Math.min(low, y); }
  assert.ok(low < 0, 'the lurch had begun');
  assert.ok(d.message("You don't fall in."));
  for (let i = 0; i < 60; i++) { y = d.update(.05); assert.ok(y <= 0 && y >= low - 1e-9); }
  assert.equal(y, 0);
  assert.equal(d.active, false);
  assert.equal(d.arrive(), false, 'no level change plays no fall-in');
  // escape with no preceding lurch: nothing moves, and it ends exactly at rest
  assert.ok(d.message('You escape a trap door.'));
  for (let i = 0; i < 60; i++) y = d.update(.05);
  assert.equal(y, 0);
  assert.equal(d.arrive(), false);
});

test('after the dead bounce the hero lies still, then jerks once and is at rest', () => {
  const end = ARRIVE_TIME - SETTLE_GAP - SETTLE_LEN;
  assert.ok(Math.abs(arriveOffset(end + SETTLE_GAP / 2)) < 1e-9);
  const mid = arriveOffset(end + SETTLE_GAP + SETTLE_LEN / 2);
  assert.ok(mid > 0 && mid <= SETTLE_HEIGHT + 1e-9, String(mid));
  assert.ok(Math.abs(arriveOffset(ARRIVE_TIME)) < 1e-9);
});

test('the hover sags once when the hole tugs, never below the floor, and still ends at rest', () => {
  const at = k => hoverOffset(k * HOVER_TIME);
  assert.ok(at(.6) < at(.45) * .5, 'sags at the tug');
  assert.ok(at(.72) > at(.6), 'catches itself after');
  for (let i = 0; i <= 100; i++) assert.ok(at(i / 100) >= 0 && at(i / 100) <= HOVER_LIFT + 1e-9);
});
