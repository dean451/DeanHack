import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {creditsHtml, CREDITS, SOURCE_URL, LICENSE_URL, touchOnly, KEYBOARD_NOTE, keysHtml, KEYS, createKeysCard, KEYS_SEEN} from './start-extras.js';

test('the credits name the source, the licence and everything the page ships that we did not make', () => {
  const html = creditsHtml();
  assert.ok(html.includes(SOURCE_URL) && html.includes(LICENSE_URL));
  assert.match(html, /NetHack General Public License/);assert.match(html, /not affiliated with the NetHack DevTeam/);assert.match(html, /no warranty/);
  for (const name of ['NetHack', 'UnNetHack', 'three.js', 'meshoptimizer', 'Fox model', 'English Towne']) assert.ok(CREDITS.some(c => c[0].startsWith(name)), name);
  // the fox's glTF conversion is CC BY 4.0: its credit is required (models/CREDITS.md)
  assert.match(html, /@AsoboStudio and @scurest/);
  const deps = Object.keys(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).dependencies);
  for (const d of deps) assert.ok(CREDITS.some(c => c[0].toLowerCase().startsWith(d.toLowerCase())), `runtime dependency ${d} is credited`);
  for (const link of html.match(/href="[^"]*"/g)) assert.match(link, /href="(https:\/\/|\/)/);
});

test('the NetHack licence served from the site is dat/license, word for word', () => {
  assert.equal(readFileSync(new URL('./public/LICENSE-NETHACK.txt', import.meta.url), 'utf8'), readFileSync(new URL('../dat/license', import.meta.url), 'utf8'));
  assert.equal(LICENSE_URL, '/LICENSE-NETHACK.txt');
});

test('only a touch-only device is told it needs a keyboard', () => {
  const win = q => ({matchMedia: m => ({matches: q.includes(m)})});
  assert.equal(touchOnly(win(['(hover: none) and (pointer: coarse)'])), true, 'a phone');
  assert.equal(touchOnly(win(['(hover: none) and (pointer: coarse)', '(any-pointer: fine)'])), false, 'a tablet with a trackpad');
  assert.equal(touchOnly(win([])), false, 'a computer');
  assert.equal(touchOnly(null), false);
  assert.match(KEYBOARD_NOTE, /keyboard/);
});

// a tiny DOM: elements with children, listeners and remove()
function fakeDoc() {
  const listeners = {};
  const el = tag => ({tag, children: [], listeners: {}, set innerHTML(h) { this.html = h;this.firstElementChild = el('div');this.firstElementChild.html = h;this.firstElementChild.parent = null; },
    querySelector(sel) { return sel === '.keys-close' ? (this.close ??= el('button')) : null; }, addEventListener(t, f) { this.listeners[t] = f; }, append(c) { this.children.push(c);c.parent = this; }, remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }});
  const body = el('body');
  const timers = [];
  return {body, listeners, timers, createElement: el, addEventListener: (t, f) => { listeners[t] = f; }, removeEventListener: t => { delete listeners[t]; },
    defaultView: {setTimeout: (f, ms) => { timers.push({f, ms});return timers.length; }, clearTimeout: () => {}}};
}
const memory = () => { const m = new Map();return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v)}; };

test('the keys card names the essential keys, shows once per browser, and closes on its button, Escape or a timer', () => {
  const html = keysHtml();
  for (const [k] of KEYS) assert.ok(html.includes(k.replace('<', '&lt;').replace('>', '&gt;')), k);
  assert.match(html, /h j k l/);
  const doc = fakeDoc(), storage = memory(), card = createKeysCard({doc, storage, ms: 1000});
  assert.equal(card.show(), true);assert.equal(doc.body.children.length, 1);assert.equal(storage.getItem(KEYS_SEEN), '1');
  assert.equal(card.show(), false, 'not twice at once');
  doc.listeners.keydown({key: 'h'});assert.equal(card.open, true, 'a game key does not close it, and is not taken');
  doc.listeners.keydown({key: 'Escape'});assert.equal(card.open, false);assert.equal(doc.body.children.length, 0);
  assert.equal(createKeysCard({doc, storage}).show(), false, 'never again in this browser');
  const d2 = fakeDoc(), c2 = createKeysCard({doc: d2, storage: memory(), ms: 1000});c2.show();
  assert.equal(d2.timers[0].ms, 1000);d2.timers[0].f();assert.equal(c2.open, false, 'gone after a while');
});

test('the splash wires the credits, the keyboard notice and the keys card', () => {
  const src = readFileSync(new URL('./start-screen.js', import.meta.url), 'utf8');
  assert.match(src, /installCredits\(\{button:\$\('\.start-about-toggle'\),box:\$\('#start-about'\)\}\)/);
  assert.match(src, /if\(touchOnly\(win\)\)/);
  assert.match(src, /const landed=\(\)=>\{if\(!descending\|\|landing\)return;keys\?\.show\(\);/);
});
