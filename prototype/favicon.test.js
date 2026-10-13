import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAVICONS, faviconHref, startFavicon} from './favicon.js';

test('the tab icon turns through crossed swords, a dragon and a shield', () => {
  assert.deepEqual(FAVICONS, ['⚔️', '🐉', '🛡️']);
  const link = {href: ''}, doc = {querySelector: q => q === 'link[rel="icon"]' ? link : null};
  let tick;
  startFavicon(doc, {setInterval: fn => { tick = fn; return 1; }});
  const seen = [link.href];
  for (let i = 0; i < 3; i++) { tick(); seen.push(link.href); }
  assert.deepEqual(seen, [...FAVICONS, FAVICONS[0]].map(faviconHref));
  assert.match(decodeURIComponent(faviconHref('🐉')), /^data:image\/svg\+xml,<svg[^>]*><text[^>]*>🐉<\/text><\/svg>$/);
});

test('the page starts on crossed swords before any script runs', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,[^"]*%E2%9A%94%EF%B8%8F/);
  assert.match(html, /<script type="module" src="\/favicon.js"><\/script>/);
});
