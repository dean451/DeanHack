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

test('the footer buttons are only Save & exit, Demo room and the demo reset', () => {
  const html = read('index.html'), live = read('live.js');
  for (const label of ['Rotate view', 'Quaff', 'Pick up', 'Inventory</button>', 'Open door']) {
    assert.ok(!html.includes(label) && !live.includes(`>${label}`), `${label} button is gone`);
  }
  assert.match(live, /<button data-key="83">Save & exit<\/button>/);
  assert.doesNotMatch(read('main.js'), /#camera/);
});

test('the page carries no badge, brand block or footer blurb', () => {
  const html = read('index.html'), css = read('style.css'), live = read('live.js');
  assert.doesNotMatch(html, /VISUAL PROTOTYPE|class="brand"|class="badge"|Standalone scene|Drag to orbit/);
  assert.doesNotMatch(css, /\.brand|\.badge|footer>small/);
  assert.doesNotMatch(live, /Real UnNetHack rules|footer>small/);
  // the branch heading only shows for real named levels
  assert.match(live, /h1'\)\.hidden=!where\.named/);
});
