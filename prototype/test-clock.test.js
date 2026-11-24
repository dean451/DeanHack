import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {cpuNow} from './test-clock.js';

test('the budget clock counts work, not waiting', async () => {
  const t0 = cpuNow();await new Promise(r => setTimeout(r, 120));const waited = cpuNow() - t0;
  assert.ok(waited < 60, `a 120 ms sleep is not work (${waited.toFixed(1)} ms)`);
  const t1 = cpuNow();let x = 0;for (let i = 0; i < 3e7; i++) x += Math.sqrt(i);const worked = cpuNow() - t1;
  assert.ok(worked > 5 && x > 0, `a busy loop is (${worked.toFixed(1)} ms)`);
});

test('no build-time budget in the suite reads the wall clock', () => {
  for (const f of readdirSync(new URL('.', import.meta.url)).filter(n => n.endsWith('.test.js'))) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /t0\s*=\s*performance\.now\(\)/, `${f}: time a budget with cpuNow() (test-clock.js)`);
  }
});
