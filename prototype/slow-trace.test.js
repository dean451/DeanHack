import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarize, installSlowTrace, SAMPLE_MS} from './slow-trace.js';

test('a trace is summed into the functions that took the time, own and with callees', () => {
  const trace = {resources: ['http://x/live.js?t=1'], frames: [{name: 'apply', resourceId: 0, line: 10}, {name: 'buildCat', resourceId: 0, line: 99}],
    stacks: [{frameId: 0}, {frameId: 1, parentId: 0}], samples: [{stackId: 1, timestamp: 10}, {stackId: 1, timestamp: 20}, {stackId: 1, timestamp: 30}, {stackId: 0, timestamp: 40}, {timestamp: 50}]};
  const s = summarize(trace);
  assert.deepEqual(s.self[0], ['buildCat live.js:99', 3 * SAMPLE_MS]);
  assert.deepEqual(s.total[0], ['apply live.js:10', 4 * SAMPLE_MS], 'the caller holds its callees\' time too');
  const during = summarize([null, trace], 25, {start: 35, end: 45});
  assert.deepEqual(during.self, [['apply live.js:10', SAMPLE_MS]], 'only the samples taken during the freeze');
});

test('without the Profiler API (a production build, another browser) nothing is installed', () => {
  assert.equal(installSlowTrace({win: {}}), null);
  assert.equal(installSlowTrace({enabled: false, win: {Profiler: function () {}, PerformanceObserver: function () {}}}), null);
});

test('the dev server allows self-profiling and main.js installs it there only', () => {
  assert.match(readFileSync(new URL('./vite.config.js', import.meta.url), 'utf8'), /headers:\{'Document-Policy':'js-profiling'\}/);
  assert.match(readFileSync(new URL('./main.js', import.meta.url), 'utf8'), /installSlowTrace\(\{enabled:import\.meta\.env\.DEV,/);
});
