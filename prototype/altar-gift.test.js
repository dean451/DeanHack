import test from 'node:test';
import assert from 'node:assert/strict';
import {shaftPose, flashPose, sparkPose, isGiftMessage, GIFT} from './altar-gift.js';

test('only the gift message triggers it', () => {
  assert.ok(isGiftMessage('You hear a voice booming: "Use my gift wisely!"'));
  for (const t of ['Your sacrifice is consumed in a flash of light!', 'You glimpse a four-leaf clover at your feet.', null]) assert.ok(!isGiftMessage(t), String(t));
});

test('everything returns exactly to rest', () => {
  for (const t of [0, GIFT.total]) {
    assert.equal(shaftPose(t).alpha, 0); assert.equal(flashPose(t).alpha, 0);
    for (let i = 0; i < GIFT.sparks; i++) assert.equal(sparkPose(i, t).alpha, 0);
  }
});

test('poses stay in bounds; the shaft stabs down fast, hangs, then is cut off', () => {
  let peak = 0;
  for (let t = 0; t <= GIFT.total; t += .01) {
    const s = shaftPose(t), f = flashPose(t);
    assert.ok(s.height >= 0 && s.height <= 1 && s.width >= 0 && s.width <= .12 + 1e-9 && s.alpha >= 0 && s.alpha <= 1, `shaft ${t}`);
    assert.ok(f.alpha >= 0 && f.alpha <= 1.05 && f.radius >= 0 && f.radius <= .55 + 1e-9, `flash ${t}`);
    for (let i = 0; i < GIFT.sparks; i++) { const p = sparkPose(i, t); assert.ok(p.alpha >= 0 && p.alpha <= 1 && Math.hypot(p.x, p.z) <= .5 + 1e-9 && p.y >= 0 && p.y <= .35 + 1e-9, `spark ${i} ${t}`); }
    peak = Math.max(peak, s.height);
  }
  assert.ok(peak > .99 && shaftPose(GIFT.drop).height > .99);
  assert.ok(shaftPose(.3).height > .99 && shaftPose(.9).height < .3);
  assert.ok(flashPose(GIFT.drop + .05).alpha > .5 && flashPose(GIFT.total - .05).alpha < flashPose(GIFT.drop + .05).alpha);
});

test('the hanging shaft recoils once, then stabs back to full height', () => {
  assert.ok(shaftPose(.46).height < .8, 'it flinches');
  assert.ok(shaftPose(.3).height > .99 && shaftPose(.56).height > .99);
});
