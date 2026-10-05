import test from 'node:test';
import assert from 'node:assert/strict';
import {ladyPose, isLadyMessage, LADY, ARM_MAX} from './fountain-lady.js';

test('only the Lady of the Lake message triggers her', () => {
  assert.ok(isLadyMessage('From the murky depths, a hand reaches up to bless the sword.'));
  for (const t of ['As the hand retreats, the fountain disappears!', 'From the murky drain, a hand reaches up... --oops--', 'You dip the long sword into the fountain.', null]) assert.ok(!isLadyMessage(t), String(t));
});

test('the arm starts and ends hidden, with no glow left', () => {
  for (const t of [0, LADY.total, LADY.total + 1]) {
    const p = ladyPose(t);
    assert.equal(p.rise, 0); assert.equal(p.glow, 0); assert.equal(p.twitch, 0); assert.equal(p.turn, 0);
  }
});

test('the arm rises, holds near full height, and stays in bounds', () => {
  let peak = 0;
  for (let t = 0; t <= LADY.total; t += .01) {
    const p = ladyPose(t);
    peak = Math.max(peak, p.rise);
    assert.ok(p.rise >= 0 && p.rise <= ARM_MAX + 1e-9 && p.glow >= 0 && p.glow <= 1.0001 && Math.abs(p.twitch) < .25, `${t}`);
  }
  assert.ok(peak > ARM_MAX - .01);
  assert.ok(ladyPose(LADY.turnAt - .1).rise > ARM_MAX * .95);
});

test('the blade turns once, then the arm twitches', () => {
  assert.ok(ladyPose(LADY.turnAt + .35).turn > 1);
  assert.equal(ladyPose(LADY.turnAt + .8).turn, 0);
  let tw = 0;
  for (let t = LADY.twitchAt; t < LADY.twitchAt + .25; t += .005) tw = Math.max(tw, Math.abs(ladyPose(t).twitch));
  assert.ok(tw > .1);
});

test('it is smooth: no pop between frames', () => {
  let prev = ladyPose(0);
  for (let t = .01; t <= LADY.total; t += .01) {
    const p = ladyPose(t);
    assert.ok(Math.abs(p.rise - prev.rise) < .03 && Math.abs(p.glow - prev.glow) < .12, `${t}`);
    prev = p;
  }
});
