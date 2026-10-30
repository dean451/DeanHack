import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MEASURES, DRAGON, INSECTS, FOWL, WILDCAT, CANINE, GARGOYLE, HUMAN} from './creature-measures.js';

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

test('the insect numbers are the animals\' own', () => {
  const {ant, bee, stag} = MEASURES.insects;
  // stride length grows with speed, but less than in proportion
  for (const b of ant.strideExponent) inside(b, [.2, .7], 'stride exponent');
  inside(ant.runAbove, [200, 500], 'running speed, mm/s');
  inside(mid(bee.worker), [10, 15], 'a worker honeybee, mm');
  inside(bee.sleepMinutes, [5, 60], 'a bee\'s still sleep, minutes');
  // a male stag beetle is longer than a female, and the mandibles make up a good part of him
  assert(stag.male[1] > stag.female[1] && stag.maleBody[1] < stag.male[1]);
  inside(INSECTS.mandibleShare, [.2, .5], 'mandibles\' share of a male stag\'s length');
});

test('the fowl numbers are the animals\' own', () => {
  const {fowl} = MEASURES;
  assert.equal(fowl.bobPerStep, 1);
  // a crow lasts a second or two, the jungle fowl's sequence about the same
  for (const s of fowl.crowSeconds) inside(s, [1, 3], 'crow, seconds');
  inside(fowl.jungleCrowMs / 1000, [1, 2], 'a jungle fowl crow sequence, seconds');
  // a hen sits the perch for most of the dark and lies for most of that, so lying is a good part of the night but not all of it
  inside(fowl.perchDarkShare, [.5, 1], 'perch share of the dark'); inside(fowl.proneNightShare, [.5, 1], 'lying share of the night');
  inside(FOWL.lyingDark, [.5, .8], 'lying on the perch, share of the dark');
});

test('the wild cat numbers are the animals\' own', () => {
  const {tiger, leopard, sleepHours, stealthRecovery} = MEASURES.wildCat;
  // a tiger's tail is under half its head and body; males are longer than females; a leopard is the smaller cat
  inside(tiger.tail[1] / tiger.headBody.female[1], [.3, .8], 'tail against head and body, cm');
  assert(tiger.headBody.male[1] > tiger.headBody.female[1] && leopard.headBody[1] < tiger.headBody.male[1]);
  inside(mid(tiger.shoulder), [70, 110], 'tiger shoulder height, cm');
  inside(WILDCAT.tailShare[0], [.15, .4], 'tail share of the whole, low'); inside(WILDCAT.tailShare[1], [.3, .5], 'tail share of the whole, high');
  // asleep most of the day, like the lion
  inside(WILDCAT.sleepShare[0], [.6, .9], 'share of the day asleep'); assert.deepEqual(sleepHours, MEASURES.dragon.bigCat.sleepHours);
  // a crouched stalk recovers little of its energy, a good deal less than a dog's 70%
  assert(stealthRecovery.mean < .3 && stealthRecovery.max < .5 && stealthRecovery.max > stealthRecovery.mean);
});

test('the canine numbers are the dog\'s own', () => {
  const {curledShare, ownerSleepHours, walkSpeed, trotSpeed} = MEASURES.canine;
  // curled is the commonest way to sleep, but not the only one
  inside(curledShare, [.5, .9], 'share of owners reporting a curled dog');
  inside(ownerSleepHours, [6, 14], 'hours asleep a day, as owners see it'); inside(CANINE.sleepShare, [.25, .6], 'share of the day');
  // a dog walks and trots at a pace of about a metre a second
  for (const v of [...walkSpeed, ...trotSpeed]) inside(v, [.5, 1.5], 'walking or trotting speed, m/s');
  assert(walkSpeed[0] < walkSpeed[1] && trotSpeed[0] < trotSpeed[1] && CANINE.curledMostly);
  inside(CANINE.walkMid, [.7, 1.1], 'mid walking speed, m/s');
});

test('the gargoyle numbers are a monkey\'s rest and a hawk\'s perch', () => {
  const {macaqueRest, hawkOneFoot} = MEASURES.gargoyle;
  // a macaque rests about a third of the day
  for (const v of macaqueRest) inside(v, [.25, .45], 'share of the day a macaque rests');
  inside(GARGOYLE.restShare, [.3, .4], 'mid share resting'); inside(hawkOneFoot, [.1, .35], 'share of time on one foot');
  assert(GARGOYLE.oneFootMax < GARGOYLE.restShare);
});

test('the humanoid numbers are an adult human\'s walk', () => {
  const {walkSpeed, cadence, stepWidth} = MEASURES.human;
  for (const v of walkSpeed) inside(v, [1.1, 1.5], 'usual walking speed, m/s');
  inside(cadence, [100, 130], 'steps a minute');
  inside(stepWidth, [.08, .2], 'step width as a share of leg length');
  // a step is about two thirds of a metre
  inside(HUMAN.stepLength, [.55, .8], 'step length, m');
  assert(walkSpeed[0] < walkSpeed[1]);
});

test('every number in CREATURE-MEASURES.md has a source link in its row', () => {
  const md = readFileSync(new URL('./CREATURE-MEASURES.md', import.meta.url), 'utf8');
  const rows = md.split('\n').filter(l => /^\| [^-|]/.test(l) && !/^\| Measure \|/.test(l));
  assert(rows.length >= 12, `${rows.length} rows`);
  for (const r of rows) assert(/\]\(https?:\/\//.test(r) || /the same|as above|above/.test(r), `no source: ${r.slice(0, 80)}`);
});

function mid([a, b]) { return (a + b) / 2; }
