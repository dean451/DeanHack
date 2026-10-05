import test from 'node:test';
import assert from 'node:assert/strict';
import {snakePose, isSnakeMessage, SNAKES} from './fountain-snakes.js';

test('only the snake-fountain message triggers it', () => {
  assert.ok(isSnakeMessage('An endless stream of snakes pours forth!'));
  assert.ok(isSnakeMessage('An endless stream of newts pours forth!'));
  for (const t of ['The fountain bubbles furiously for a moment, then calms.', 'You see here a snake.', null]) assert.ok(!isSnakeMessage(t), String(t));
});

test('every snake starts and ends invisible', () => {
  for (let i = 0; i < SNAKES.count; i++) {
    assert.equal(snakePose(i, 0).alpha, 0);
    assert.equal(snakePose(i, SNAKES.total).alpha, 0);
  }
});

test('snakes crawl out one after another, never backwards, and pause to taste the air', () => {
  for (let i = 0; i < SNAKES.count; i++) {
    let prev = snakePose(i, 0).dist, stalled = 0;
    for (let t = .01; t <= SNAKES.total; t += .01) {
      const p = snakePose(i, t);
      assert.ok(p.dist >= prev - 1e-9 && p.dist < 1.1 && p.alpha >= 0 && p.alpha <= 1, `${i} ${t}`);
      assert.ok(p.dist - prev < .03, `pop ${i} ${t}`);
      if (p.dist === prev && p.alpha > .5) stalled++;
      prev = p.dist;
    }
    assert.ok(stalled > 5, `snake ${i} never paused`);
  }
  assert.ok(snakePose(0, .5).alpha > snakePose(3, .5).alpha);
});
