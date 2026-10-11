import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const png=readFileSync(new URL('./public/og.png',import.meta.url));
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const caddy=readFileSync(new URL('../deploy/Caddyfile',import.meta.url),'utf8');

test('the link-preview banner is a 1200x630 PNG of sensible size',()=>{
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),1200,'width');
  assert.equal(png.readUInt32BE(20),630,'height');
  assert.ok(png.length<1_000_000,'link preview images should stay under 1 MB');
});

test('the page declares the banner for link previews',()=>{
  assert.match(html,/property="og:image" content="https:\/\/deanhack\.online\/og\.png"/);
  assert.match(html,/property="og:image:width" content="1200"/);
  assert.match(html,/name="twitter:card" content="summary_large_image"/);
});

test('only the banner and the bare preview card are reachable without the password',()=>{
  const preview=caddy.indexOf('handle @preview'),banner=caddy.indexOf('handle /og.png'),gated=caddy.indexOf('handle {');
  assert.ok(preview>0&&banner>preview&&gated>banner,'public handlers come before the gated catch-all');
  assert.ok(caddy.indexOf('basic_auth')>gated,'basic_auth lives inside the catch-all, after the public handlers');
  assert.equal(caddy.split('basic_auth').length-1,1);
});
