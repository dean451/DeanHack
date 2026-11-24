import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import failures from './tools/failures-reporter.mjs';

async function* events(list) { for (const e of list) yield e; }
const collect = async gen => { let out = '';for await (const s of gen) out += s;return out; };

test('npm test lists the failures again at the end, with file and message; a clean run adds nothing', async () => {
  const fail = {type: 'test:fail', data: {name: 'the kitten grows', file: '/x/feline.test.js', line: 9, details: {type: 'test', error: {cause: {message: 'kitten grown in 9894 ms'}}}}};
  const out = await collect(failures(events([{type: 'test:pass', data: {name: 'ok'}}, fail, {type: 'test:fail', data: {name: 'a suite', details: {type: 'suite'}}}])));
  assert.match(out, /# 1 failing/);assert.match(out, /# not ok: the kitten grows\n#   at \/x\/feline\.test\.js:9\n#   kitten grown in 9894 ms/);
  assert.equal(await collect(failures(events([{type: 'test:pass', data: {name: 'ok'}}]))), '');
  const runner = readFileSync(new URL('./tools/run-tests.mjs', import.meta.url), 'utf8');
  assert.match(runner, /failures-reporter\.mjs/);assert.match(runner, /--test-reporter=tap/);
});
