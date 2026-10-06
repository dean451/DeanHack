import test from 'node:test';
import assert from 'node:assert/strict';
import {LIVE_KEYS_HTML} from './live-keys.js';

test('the legend pairs search with explore', () => {
  assert.match(LIVE_KEYS_HTML, /<kbd>s<\/kbd> Search <kbd>v<\/kbd> Explore/);
  for (const k of ['SPACE', 'i', 'y u b n']) assert.ok(LIVE_KEYS_HTML.includes(`<kbd>${k}</kbd>`));
});

test('the legend lists pick up, autopickup, kick, actions and options', () => {
  for (const k of [',', '@', 'Ctrl-d', '#', 'O']) assert.ok(LIVE_KEYS_HTML.includes(`<kbd>${k}</kbd>`), k);
});

test('the legend keeps entries short and wraps only between entries', async () => {
  const {readFileSync} = await import('node:fs');
  const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  assert.match(css, /\.keys span\{white-space:nowrap\}/);
  assert.ok(LIVE_KEYS_HTML.includes('<kbd>h j k l ←↑↓→</kbd>'));
  for (const label of LIVE_KEYS_HTML.match(/<\/kbd> [^<]+/g)) assert.ok(label.length < 20, label);
});
