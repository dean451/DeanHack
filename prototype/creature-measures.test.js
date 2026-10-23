import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MEASURES, DRAGON} from './creature-measures.js';

const inside = (v, [a, b], what) => assert(v >= a && v <= b, `${what}: ${v} outside ${a} to ${b}`);

test('the dragon numbers are the animals\' own, in ranges that make sense for them', () => {
  const {lizard, bigCat, bat, raptor} = MEASURES.dragon;
  // a monitor's tail is a large share of it, but never most of it past two thirds
  inside(lizard.tailShare[0], [.3, .6], 'monitor tail share low'); inside(lizard.tailShare[1], [.45, .7], 'monitor tail share high');
  // a running lizard holds its head far steadier than its trunk swings, and every head angle is a few degrees
  assert(lizard.headYaw < lizard.trunkYaw / 3);
  for (const v of Object.values(lizard.headRange)) inside(v, [0, 15], 'head range');
  // a lion is one and a half to two and a half metres without the tail, and the tail is about two fifths of the whole
  inside(bigCat.headBody.male[0], [150, 200], 'lion'); inside(bigCat.headBody.male[1], [220, 270], 'lion');
  inside(mid(bigCat.tail) / (mid(bigCat.headBody.male) + mid(bigCat.tail)), [.25, .45], 'lion tail share');
  for (const s of bigCat.tailShare) inside(s, [.3, .5], 'zoo lion tail share');
  inside(bigCat.sleepHours[1], [12, 22], 'a cat sleeps most of the day');
  // a little brown bat's forearm is a few centimetres and its span six or seven forearms
  inside(mid(bat.span) / mid(bat.forearm), [5, 8], 'span in forearms');
  assert(bat.length[1] < bat.span[0], 'a bat spans more than its length');
  // a buteo spans about twice its length or more
  inside(mid(raptor.span) / mid(raptor.length.male), [1.8, 2.8], 'raptor span to length');
});

test('what the dragon uses follows from them', () => {
  inside(DRAGON.headSteady, [.1, .3], 'head steadiness');
  inside(DRAGON.forearmMid, [.25, .4], 'forearm share of the half-span');
  assert(DRAGON.forearmShare[0] < DRAGON.forearmMid && DRAGON.forearmMid < DRAGON.forearmShare[1]);
  assert(DRAGON.spanToLength[0] > 1.5 && DRAGON.spanToLength[1] < 3.2);
  inside(DRAGON.sleepShare[1], [.6, .9], 'share of the day asleep');
});

test('every number in CREATURE-MEASURES.md has a source link in its row', () => {
  const md = readFileSync(new URL('./CREATURE-MEASURES.md', import.meta.url), 'utf8');
  const rows = md.split('\n').filter(l => /^\| [^-|]/.test(l) && !/^\| Measure \|/.test(l));
  assert(rows.length >= 12, `${rows.length} rows`);
  for (const r of rows) assert(/\]\(https?:\/\//.test(r) || /the same|as above|above/.test(r), `no source: ${r.slice(0, 80)}`);
});

function mid([a, b]) { return (a + b) / 2; }
