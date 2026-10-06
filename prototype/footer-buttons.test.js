import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

test('footer buttons are small, quiet text with no filled box', () => {
  const rule = css.match(/footer \.buttons button,\.engine-actions button\{([^}]*)\}/)?.[1];
  assert.ok(rule, 'rule exists');
  assert.match(rule, /font-size:10px/);
  assert.match(rule, /background:transparent/);
  assert.match(rule, /padding:2px 7px/);
});
