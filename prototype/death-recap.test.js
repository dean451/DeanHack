import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeathRecap, recapAsk} from './death-recap.js';
import {deathCard} from './start-screen.js';
import {liveSource} from './live-source.js';

const ask = prompt => ({type: 'request', kind: 'key', prompt: `${prompt} [ynq] (default: y)`});

test('only the end-of-game questions start the recap', () => {
  assert.equal(recapAsk('Do you want your possessions identified? [ynq] (default: y)'), 'Possessions');
  assert.equal(recapAsk('Do you want to see what you had when you died?'), 'Possessions');
  assert.equal(recapAsk('Do you want an account of creatures vanquished?'), 'Vanquished');
  assert.equal(recapAsk('Do you want to add to the current engraving?'), null);
  const r = createDeathRecap();
  assert.equal(r.answer({type: 'request', kind: 'more', prompt: 'Continue'}, null, ['You die...']), null, 'before the end questions, a --More-- is the player\'s');
  assert.equal(r.answer(ask('Do you want to read the book anyway?'), null, null), null);
});

test('the end questions are answered yes and every window is kept under its heading, then dismissed', () => {
  const r = createDeathRecap();
  assert.equal(r.answer(ask('Do you want your possessions identified?'), null, null), 121, 'yes');
  assert.ok(r.collecting);
  const inv = {items: [{text: 'Weapons'}, {text: 'a +1 long sword (weapon in hand)'}, {text: ''}]};
  assert.equal(r.answer({type: 'request', kind: 'menu', prompt: ''}, inv, null), '!', 'the identified pack is kept, the window closed');
  assert.equal(r.answer(ask('Do you want to see your attributes?'), null, null), 121);
  assert.equal(r.answer({type: 'request', kind: 'more', prompt: 'Continue'}, null, ['Background:', ' You were a valkyrie.']), 13);
  assert.equal(r.answer(ask('Do you want an account of creatures vanquished?'), null, null), 121);
  assert.equal(r.answer({type: 'request', kind: 'more'}, null, ['  3 newts', '  a jackal']), 13);
  const sections = r.take();
  assert.deepEqual(sections.map(s => s.title), ['Possessions', 'Attributes', 'Vanquished']);
  assert.deepEqual(sections[0].lines, ['Weapons', 'a +1 long sword (weapon in hand)'], 'blank lines dropped');
  assert.equal(r.collecting, false, 'taken: done');
});

test('the tombstone lays the recap out in sections, the first open, every line escaped', () => {
  const html = deathCard({name: 'Mira', killer: 'killed by a <b>newt</b>', depth: 3, dungeon: 'The Dungeons of Doom'},
    [{title: 'Possessions', lines: ['a blessed +2 <cloak>']}, {title: 'Conduct', lines: ['You were a vegetarian.']}]);
  assert.match(html, /<details open><summary>Possessions<\/summary><pre>a blessed \+2 &lt;cloak&gt;<\/pre><\/details><details><summary>Conduct/);
  assert.doesNotMatch(html, /<b>newt<\/b>|<cloak>/);
  assert.doesNotMatch(deathCard({name: 'M', killer: 'starved'}), /class="recap"/, 'no recap, no section');
});

test('live.js answers the end questions for the recap and hands it to the splash', () => {
  const src = liveSource();
  assert.match(src, /S\.pending=v;[^\n]*const auto=deathRecap\.answer\(v,S\.menu,S\.lines\);if\(auto!==null\)\{S\.menu=null;S\.lines=\[\];void reply\(auto\);return;\}/);
  assert.match(src, /void S\.startScreen\.open\(\{note,death,recap:deathRecap\.take\(\)\}\)/);
});
