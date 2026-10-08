import test from 'node:test';
import assert from 'node:assert/strict';
import {createStatusProgress, worstProgress} from './status-progress.js';

test('a countdown fills turn by turn and caps at 1', () => {
  const sp = createStatusProgress();
  const seen = [10, 11, 12, 13, 14, 15, 16].map(t => sp.update(['Stone'], t).stone);
  assert.ok(seen[0] > 0 && seen[0] < 1);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1]);
  assert.equal(seen.at(-1), 1);
});

test('a cured condition forgets its start, so the next one begins at the bottom', () => {
  const sp = createStatusProgress();
  sp.update(['Slime'], 1); sp.update(['Slime'], 6);
  assert.deepEqual(sp.update(['Hungry'], 7), {});
  assert.ok(sp.update(['Slime'], 20).slime < 0.2);
});

test('only deadly words count, and worstProgress picks the furthest', () => {
  const sp = createStatusProgress();
  assert.deepEqual(sp.update(['Blind', 'Conf'], 3), {});
  const p = sp.update(['Strngl', 'Ill'], 3);
  assert.ok(p.strngl > p.ill);
  assert.equal(worstProgress(p), p.strngl);
  assert.equal(worstProgress({}), 0);
});
