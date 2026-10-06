import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');

test('there is no audio anywhere in the client', () => {
  for (const file of ['main.js', 'live.js', 'index.html']) {
    const src = read(file);
    assert.doesNotMatch(src, /AudioContext|createOscillator|id="sound"|#sound/, `${file} must not make sound`);
  }
});
