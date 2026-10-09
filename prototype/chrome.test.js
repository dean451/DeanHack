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

test('the creatures-in-view list and the live engine caption are gone', () => {
  const live = read('live.js'), css = read('style.css');
  assert.doesNotMatch(live, /engine-seen|UNNETHACK · LIVE ENGINE|Nothing stirs in view/);
  assert.doesNotMatch(css, /engine-seen/);
});

test('the messages sit in the upper-right corner and the character panel in the upper-left', () => {
  const css = read('style.css');
  const panel = [...css.matchAll(/body\.live-engine #engine-panel\{([^}]*)\}/g)].map(m => m[1]).find(r => r.includes('position')) || '';
  assert.match(panel, /position:fixed/);
  assert.match(panel, /top:14px/);
  assert.match(panel, /right:16px/);
  assert.doesNotMatch(panel, /bottom:\d/);
  const character = css.match(/body\.live-engine \.character\{([^}]*)\}/)[1];
  assert.match(character, /top:14px/);
  assert.match(character, /left:16px/);
});

test('gold, power, experience and conditions live in the character panel, not under the messages', () => {
  const live = read('live.js');
  assert.match(live, /statusLine\.id='engine-status';\$\('\.character'\)\.append\(statusLine\)/);
  assert.doesNotMatch(live, /<div id="engine-messages" role="log"><\/div><div id="engine-status">/);
});

test('the character name is typed before starting, saved, sent with the start request and shown in the panel', () => {
  const live = read('live.js'), main = read('main.js');
  assert.match(live, /nameInput\.placeholder='Wanderer'/);
  assert.match(live, /localStorage\.setItem\('deanhack\.playerName'/);
  assert.match(live, /post\('\/engine\/start',\{name:savedPlayerName\(\)\}\)/);
  assert.match(live, /setCharacterName\(started\.name\)/);
  assert.match(main, /e\.target instanceof HTMLInputElement/, 'typing a name does not move the demo hero');
});

test('the minimap sits in the bottom-right corner and the live key legend stops short of it', () => {
  const css = read('style.css');
  const map = css.match(/#minimap\{[^}]*\}/)[0];
  assert.match(map, /right:40px/);
  assert.match(map, /bottom:25px/);
  assert.match(css, /body\.live-engine footer\{right:384px\}/);
});

test('the live panel carries no engine caption', () => {
  assert.doesNotMatch(read('live.js'), /UNNETHACK · LIVE ENGINE/);
  assert.doesNotMatch(read('style.css'), /#engine-panel>small/);
});

test('a text prompt shows everything that happened since the last command, not only the last line', () => {
  const live = read('live.js');
  assert.match(live, /if\(v\.kind==='command'\)turnMark=markTurn\(messageLog\)/, 'the mark is taken when the game asks for a command');
  assert.match(live, /sinceMark\(messageLog,turnMark\)/, 'the line prompt reads the turn\'s messages');
});

test('low vitality is marked with a warning triangle, not by red and a flash alone', () => {
  assert.match(read('style.css'), /\.character\.low-hp #hp::before\{content:"\\25B2/);
});

test('message text wraps instead of clipping', () => {
  const css = read('./style.css')
  assert.match(css, /#engine-line[^{]*#engine-messages div[^{]*\{[^}]*overflow-wrap:anywhere/)
  assert.match(css, /#engine-panel\{[^}]*max-width:calc\(100vw - 32px\)/)
})

test('the live pet cat is built from the feline model, not the old demo cat', () => {
  const live = read('./live.js');
  assert.match(live, /cell\.kind==='pet'&&\/cat\|kitten\/\.test\(cell\.name\)\)\{a=creatureFactory\?creatureFactory\(cell\):catFactory\(\)/);
});
