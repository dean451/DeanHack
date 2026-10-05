import test from 'node:test';
import assert from 'node:assert/strict';
import {leafPose, isCloverMessage, CLOVER} from './altar-clover.js';

test('only the clover message triggers it', () => {
  assert.ok(isCloverMessage('You glimpse a four-leaf clover at your feet.'));
  for (const t of ['You see crabgrass at your feet.', 'Your sacrifice is consumed in a flash of light!', null]) assert.ok(!isCloverMessage(t), String(t));
});

test('every leaf returns exactly to rest', () => {
  for (let i = 0; i < CLOVER.leaves; i++) {
    assert.equal(leafPose(i, 0).alpha, 0);
    const end = leafPose(i, CLOVER.total);
    assert.equal(end.alpha, 0); assert.equal(end.open, 0);
  }
});

test('leaves unfurl in order, stay in bounds, tremble, then wither', () => {
  for (let i = 0; i < CLOVER.leaves; i++) {
    let peak = 0, shook = false;
    for (let t = 0; t <= CLOVER.total; t += .01) {
      const p = leafPose(i, t);
      assert.ok(p.open >= 0 && p.open <= 1 && p.alpha >= 0 && p.alpha <= 1 && p.wither >= 0 && p.wither <= 1 && Math.abs(p.shake) <= .25 + 1e-9, `${i} ${t}`);
      peak = Math.max(peak, p.open); if (Math.abs(p.shake) > .05) shook = true;
    }
    assert.ok(peak > .95 && shook, `leaf ${i}`);
    assert.ok(leafPose(i, 1).open > leafPose(i, .05 + .12 * i).open);
    assert.ok(leafPose(i, 3.1).wither > .5);
  }
  assert.ok(leafPose(0, .1).open > leafPose(3, .1).open);
});
