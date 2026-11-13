import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MEASURES, DRAGON, INSECTS, FOWL, WILDCAT, CANINE, GARGOYLE, HUMAN, IMP, KOBOLD, LEPRECHAUN, NYMPH, SOLDIER, QUADRUPED, RAT, ZRUTY, SPIDER, BAT, ELEMENTAL, HORSE, WORM, GNOME, GRIDBUG, ANGELIC, CENTAUR} from './creature-measures.js';

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

test('the imp numbers are a monkey\'s walk and a bird\'s bob', () => {
  const {monkeyWalkSpeed, macaqueTreadmill, gullBobSpeed, gullNoBobSpeed} = MEASURES.imp;
  // a monkey walks a treadmill at a metre a second or less, up to a little over one and a half for macaques
  for (const v of monkeyWalkSpeed) inside(v, [.2, 1.2], 'monkey walking speed, m/s');
  for (const v of macaqueTreadmill) inside(v, [.2, 2], 'macaque treadmill speed, m/s');
  assert(monkeyWalkSpeed[0] < monkeyWalkSpeed[1] && macaqueTreadmill[0] < macaqueTreadmill[1]);
  inside(IMP.walkMid, [.5, .9], 'mid monkey walking speed, m/s');
  // a bird bobs at the slower speeds, in head lengths a second
  inside(gullBobSpeed, [1, 5], 'bobbing speed, head lengths a second'); inside(gullNoBobSpeed, [2, 8], 'non-bobbing speed');
  assert(IMP.bobbingBelowRun);
});

test('the kobold numbers are a crouched walk and a dog\'s head tip', () => {
  const {crouchKnee, crouchKneeSim, crouchSpeedShare, atlasSwing} = MEASURES.kobold;
  // a crouch starts near 30 degrees of knee bend; the simulated one is deeper and slower
  inside(crouchKnee, [20, 45], 'crouch threshold, degrees'); inside(crouchKneeSim, [30, 90], 'simulated crouch, degrees');
  assert(crouchKneeSim > crouchKnee);
  inside(crouchSpeedShare, [.3, .8], 'crouch pace share');
  for (const [a, b] of Object.values(atlasSwing)) { assert(a < b); inside(a, [1, 20], 'atlas swing, degrees'); inside(b, [5, 30], 'atlas swing, degrees'); }
  inside(KOBOLD.crouchKnee, [.3, 1], 'crouch knee, rad');
  inside(KOBOLD.crouchPace, [.4, .8], 'crouched pace, m/s');
  assert(KOBOLD.headSwing[0] < KOBOLD.headSwing[1]);
});

test('the leprechaun numbers are a deep squat and a skip', () => {
  const {squatKnee, squatHip, skipSpeed, usualWalk} = MEASURES.leprechaun;
  // a deep squat bends the knee and hip past a right angle, the knee further
  inside(squatKnee, [90, 140], 'squat knee, degrees'); inside(squatHip, [90, 130], 'squat hip, degrees');
  assert(squatKnee > squatHip);
  assert(skipSpeed[0] < skipSpeed[1]);
  inside(usualWalk, [1.2, 1.4], 'usual walk, m/s');
  // skipping sits between a walk and a run: faster than a walk, slower than a sprint
  inside(LEPRECHAUN.skipMid, [2, 3.5], 'skip, m/s'); assert(LEPRECHAUN.skipOverWalk > 1.5);
  inside(LEPRECHAUN.squatKnee, [1.5, 2.5], 'squat knee, rad');
});

test('the nymph numbers are an upright sit and a relaxed lean back', () => {
  const {uprightSit, relaxedTrunkThigh, seatBack} = MEASURES.nymph;
  inside(uprightSit, [80, 100], 'upright sit, degrees');
  // a relaxed sit opens the trunk-thigh angle past a right angle, but not to a lie
  inside(relaxedTrunkThigh, [110, 160], 'relaxed trunk-thigh, degrees'); assert(relaxedTrunkThigh > uprightSit);
  assert(seatBack[0] < seatBack[1]); inside(seatBack[0], [10, 35], 'seat back, degrees'); inside(seatBack[1], [40, 70], 'seat back, degrees');
  inside(NYMPH.leanBack, [.4, 1.2], 'lean back, rad'); assert(NYMPH.relaxedHip > NYMPH.uprightHip);
});

test('the soldier numbers are a drilled march and a stand at ease', () => {
  const {quickTime, quickStep, slowMarch, doubleTime, atEaseFeet, lumbarUpright} = MEASURES.soldier;
  inside(quickTime, [100, 130], 'quick time, steps a minute');
  inside(quickStep, [.6, .9], 'quick step, m');
  assert(slowMarch < quickTime && quickTime < doubleTime);
  assert(atEaseFeet[0] < atEaseFeet[1]); for (const f of atEaseFeet) inside(f, [.2, .35], 'at ease, m');
  inside(lumbarUpright, [.5, .8], 'lumbar share');
  // a drilled march is a little brisker than a usual walk, but nowhere near a run
  inside(SOLDIER.quickPace, [1.3, 2], 'quick pace, m/s'); assert(SOLDIER.quickPace > HUMAN.walkMid);
  assert(SOLDIER.slowOverQuick < 1 && SOLDIER.chargeOverQuick > 1.3);
  inside(SOLDIER.atEaseFeet, [.2, .35], 'at ease feet, m');
});

test('the heavy quadruped numbers are an elephant walk, a cow lying and a rhino asleep', () => {
  const q = MEASURES.quadruped;
  inside(q.elephantWalk, [.4, 2], 'elephant walk, m/s');
  assert(q.elephantSlowest < q.elephantWalk && q.elephantWalk < q.elephantFastest);
  for (const r of [q.elephantStride, q.elephantStrideTime, q.cowLying]) assert(r[0] < r[1]);
  inside(q.elephantStride[0], [1.5, 2.5], 'elephant stride, m'); inside(q.elephantStrideTime[0], [2, 2.6], 'stride time, s');
  // the stride over its time is a little under the pace the study quotes (0.85 against about 1.1 m/s: the summary's own figures do not agree)
  inside(QUADRUPED.stridePace / q.elephantWalk, [.6, 1.05], 'stride over time against pace');
  inside(QUADRUPED.strideHz, [.38, .5], 'stride Hz');
  inside(q.cowLying[0], [8, 12], 'cow lying, h'); assert(q.cowLyingPasture < q.cowLyingFreestall);
  inside(QUADRUPED.cowLyingShare, [.35, .55], 'cow lying share'); assert(QUADRUPED.rhinoSleepShare < QUADRUPED.cowLyingShare);
});

test('the rat numbers are a walk, a face-washing chain and a day\'s sleep', () => {
  const r = MEASURES.rat;
  inside(r.walkSpeed[0], [.1, .3], 'rat walk low, m/s'); inside(r.walkSpeed[1], [.6, 1], 'rat walk high, m/s');
  assert(r.walkSpeed[0] < r.slowWalk && r.slowWalk < r.walkSpeed[1] && r.walkSpeed[1] < r.gallop);
  inside(RAT.strideHz, [1.5, 2.5], 'rat strides a second'); inside(RAT.slowStride, [.1, .2], 'rat slow stride, m');
  inside(r.groomChain, [3, 8], 'grooming chain, s'); assert(r.groomPhases === 4 && r.groomStrokes === 25);
  inside(RAT.strokeTime, [.1, .4], 'stroke time, s');
  // more of the light phase is spent asleep than of the dark, and about half a day in all
  assert(r.asleepLight > r.asleepDark);
  inside(RAT.asleepShare, [.45, .65], 'share of a day asleep');
});

test('the zruty numbers are a bear\'s walk and a gorilla\'s night', () => {
  const z = MEASURES.zruty;
  assert(z.bearWildWalk < z.bearEfficientWalk && z.bearEfficientWalk < z.bearWalk && z.bearWalk < z.bearRunningWalk && z.bearRunningWalk < z.bearCanter);
  inside(ZRUTY.walkMid, [1, 2.5], 'bear walk, m/s'); inside(ZRUTY.canterOverWalk, [1.3, 2], 'canter over walk');
  inside(z.gorillaNight[0], [10, 14], 'gorilla night low, h'); assert(z.gorillaNight[0] <= z.gorillaNight[1]);
  inside(ZRUTY.asleepShare, [.45, .6], 'share of a day asleep');
});

test('the spider numbers are a running gait, the speed scaling and a scorpion\'s tail', () => {
  const s = MEASURES.spider;
  assert(s.gaitLegs === 4);
  inside(s.maxSpeedExponent, [.3, .4], 'max speed exponent'); inside(s.meanSpeedExponent, [.15, .25], 'mean speed exponent');
  // the top speed grows faster with size than the usual pace
  assert(SPIDER.sprintGap > 0); inside(SPIDER.sprintGap, [.1, .25], 'sprint gap');
  inside(s.fastest, [2, 5], 'fastest spider, m/s');
  inside(SPIDER.tailShare, [.2, .3], 'scorpion tail share');
  assert(SPIDER.legsPerSet * 2 === 8);
});

test('the bat numbers are a day on the roost, a flight speed and a raven\'s size', () => {
  const b = MEASURES.bat;
  // the roost day and night and the foraging fill a day, and the 1969 record is more than any field estimate
  assert(b.roostDay + b.roostNight + b.forage === 24);
  assert(b.sleepRecord < 24 && b.sleepRecord > b.roostDay);
  inside(BAT.roostShare, [.75, .9], 'share of a day on a roost'); inside(BAT.forageShare, [.1, .25], 'share of a day foraging');
  inside(b.minPowerSpeed, [3, 7], 'minimum-power speed, m/s');
  inside(b.ravenLength[0], [.5, .65], 'raven length low, m'); assert(b.ravenLength[0] < b.ravenLength[1]);
  inside(b.ravenSpan[0], [1, 1.3], 'raven span low, m'); assert(b.ravenSpan[0] < b.ravenSpan[1]);
  inside(BAT.ravenSpanOverLength, [1.8, 2.5], 'raven span over length');
});

test('every number in CREATURE-MEASURES.md has a source link in its row', () => {
  const md = readFileSync(new URL('./CREATURE-MEASURES.md', import.meta.url), 'utf8');
  const rows = md.split('\n').filter(l => /^\| [^-|]/.test(l) && !/^\| Measure \|/.test(l));
  assert(rows.length >= 12, `${rows.length} rows`);
  for (const r of rows) assert(/\]\(https?:\/\//.test(r) || /the same|as above|above/.test(r), `no source: ${r.slice(0, 80)}`);
});

test('the elemental numbers are a still stance, a slow creep and a flame\'s flicker', () => {
  const e = MEASURES.elemental;
  // standing still, a body drifts millimetres, and more with the eyes shut
  inside(e.swayVelocity, [5, 15], 'sway speed eyes open, mm/s'); assert(e.swayVelocityClosed.every(v => v > e.swayVelocity));
  inside(ELEMENTAL.swayAmplitude, [.002, .015], 'front-to-back sway, m');
  // step length and step time share the speed between them
  inside(e.stepLengthExponent + e.stepTimeExponent, [.95, 1.05], 'step length and time exponents');
  inside(ELEMENTAL.creepStepShare, [.3, .7], 'creeping step against the usual step');
  assert(e.doubleSupport.usual < .2 && e.doubleSupport.slowest > .4, 'a creep keeps both feet down far longer');
  assert.equal(ELEMENTAL.creepDoubleSupport, e.doubleSupport.slowest);
  // a person-sized flame puffs a couple of times a second, not a candle's ten
  assert(e.flickerFactor[0] < e.flickerFactor[1]);
  ELEMENTAL.flickerHz.forEach(f => inside(f, [1.5, 3], 'flicker of a half-metre flame, Hz'));
});

test('the horse numbers are its sleep, how rarely it lies down, and its walk', () => {
  const h = MEASURES.horse;
  // a horse sleeps a few hours, most of it on its feet
  inside(h.sleepHours[0], [2, 3.5], 'sleep low, h'); inside(h.sleepHours[1], [4, 6], 'sleep high, h');
  inside(h.sleepStanding, [.6, .9], 'share of sleep standing');
  inside(HORSE.standingSleepHours, [2, 4], 'hours dozing on its feet');
  // it lies down about an hour a day, at least half an hour for REM, and some horses never
  assert(h.lyingMinutes.low <= h.lyingMinutes.mean && h.lyingMinutes.mean < h.lyingMinutes.high);
  assert(h.remMinLying < h.lyingMinutes.mean, 'the mean horse lies long enough for REM');
  inside(HORSE.lyingShare, [.02, .1], 'share of a day lying');
  // lying, mostly on the chest, rarely flat out
  assert(h.sternalShare[0] > h.lateralShare[1], 'sternal more than lateral');
  inside(HORSE.sternalOfLying, [.6, .9], 'share of lying on the chest');
  // the walk: faster as it extends, a stride of one and a half to two metres in about a second
  const w = h.walkSpeed;
  assert(w.collected < w.medium && w.medium < w.extended);
  inside(HORSE.walkMid, [1.2, 2], 'walk, m/s'); inside(HORSE.strideMid, [1.4, 2.1], 'stride, m');
  for (const s of h.walkStrideTime) inside(s, [.9, 1.3], 'stride time, s');
  // stride over stride time comes back to the measured speeds
  inside(h.walkStride[0] / h.walkStrideTime[1], [w.collected * .9, w.collected * 1.1], 'collected speed from its stride');
  inside(h.walkStride[1] / h.walkStrideTime[0], [w.extended * .9, w.extended * 1.1], 'extended speed from its stride');
});

function mid([a, b]) { return (a + b) / 2; }

test('the worm numbers are a slow crawl by longer strides, a few anchors, and a fast short strike', () => {
  const w = MEASURES.worm;
  // the worms ranged from a hundredth of a gram to over eight grams
  assert(w.massRange[0] < .1 && w.massRange[1] > 5, 'mass range spans the sizes');
  // bigger worms crawl faster mostly by longer strides: the stride grows almost as fast as the speed, the beat barely changes
  inside(w.speedExp, [.2, .5], 'speed exponent'); inside(w.strideExp, [.3, .5], 'stride exponent');
  assert(Math.abs(w.freqExp) < .15 && Math.abs(w.dutyExp) < .1, 'beat and duty factor nearly size-free');
  // stride = speed over frequency, so the exponents nearly add up
  inside(w.strideExp + w.freqExp, [w.speedExp - .05, w.speedExp + .05], 'stride plus frequency exponent gives speed');
  // a crawl of a few hundredths of a body length a second: slow
  inside(WORM.crawlBL, [.01, .1], 'crawl, body lengths a second');
  // four to six anchors along the body in a channel
  assert(w.contacts[0] < w.contacts[1]); inside(WORM.anchors, [3, 7], 'anchors');
  assert(w.wallPush > 1, 'pushes the walls harder than its weight');
  // a strike lasts well under a tenth of a second, at two to three metres a second peak, reaching a sixth of a metre
  for (const s of [w.strike.ratSnake, w.strike.cottonmouth]) {
    inside(s.v, [2, 3.5], 'peak strike speed, m/s'); inside(s.dist, [.1, .25], 'strike reach, m'); inside(s.ms, [50, 90], 'strike duration, ms');
    assert(s.dist / (s.ms / 1000) < s.v, 'the mean speed over the reach is under the peak');
  }
  inside(WORM.strikeS, [.05, .09], 'strike, s'); inside(WORM.strikeMeanV, [1.5, 2.6], 'mean strike speed, m/s');
  // it reaches out at most half its length, usually
  assert(w.strikeReach[0] < WORM.strikeShare && WORM.strikeShare <= w.strikeReach[1]);
  assert(/coiled/.test(w.rest), 'rests coiled');
});

test('the gnome numbers are a short-legged walk: slower, shorter, quicker steps, the pelvis tipped and swung round', () => {
  const g = MEASURES.gnome;
  // slower by shorter steps at a higher cadence, and the speed is a person's once leg length is taken out
  assert(g.walkSpeed.short < g.walkSpeed.control && g.stepLength.short < g.stepLength.control && g.cadence.short > g.cadence.control);
  inside(GNOME.speedShare, [.6, .9], 'speed against a person'); inside(GNOME.stepShare, [.5, .75], 'step against a person');
  inside(GNOME.cadenceShare, [1.05, 1.35], 'cadence against a person'); inside(GNOME.stepTime, [.33, .47], 'step, s');
  // speed = step times cadence, within rounding of the means
  inside(g.stepLength.short * g.cadence.short / 60, [g.walkSpeed.short * .85, g.walkSpeed.short * 1.15], 'step times cadence');
  inside(g.normSpeed.short - g.normSpeed.control, [-.05, .05], 'normalised speed difference');
  // a walk, not a run: the normalised speed stays under the walk-run Froude number's square root
  assert(g.normSpeed.short < Math.sqrt(g.walkRunFroude));
  // the adults show the same: slower, shorter strides, quicker
  assert(g.adultVsControl.speed < 0 && g.adultVsControl.stride < 0 && g.adultVsControl.strideFreq > 0);
  // the pelvis tips forward more than a person's, and turns round further each stride; it does not tip side to side more
  assert(g.pelvisTilt.short > g.pelvisTilt.control && g.pelvisRotation.short > g.pelvisRotation.control);
  assert(g.pelvisObliquity.short <= g.pelvisObliquity.control + 1);
  GNOME.pelvisTilt.forEach(t => inside(t, [.25, .5], 'standing pelvis tilt, rad'));
  GNOME.waddleYaw.forEach(t => inside(t, [.1, .3], 'waddle turn each way, rad'));
  inside(GNOME.waddleRoll, [.03, .1], 'waddle tip each way, rad');
  assert(GNOME.waddleRoll < GNOME.waddleYaw[0], 'the waddle turns more than it tips');
});

test('the grid bug numbers are a cockroach: flat at rest, a quick tripod scuttle, a startle in a twentieth of a second, a wasp\'s slanted sting', () => {
  const g = MEASURES.gridBug;
  // the tripod runs up to where the few-legged run starts, and the record is a metre or more a second
  assert(g.tripodSpeed[0] < g.tripodSpeed[1] && g.tripodSpeed[1] === g.fewLegSpeed[0] && g.fewLegSpeed[1] >= g.earlySpeed);
  inside(g.earlySpeed, [1, 1.6], 'record speed, m/s');
  // 40 lengths a second at 1.3 m/s is a body of about 3 to 4 cm, a cockroach's
  inside(g.earlySpeed / g.earlyBL, [.025, .045], 'body length, m');
  assert(g.topBL > g.earlyBL);
  inside(g.tripodHz, [4, 12], 'tight tripod stepping, Hz'); inside(g.gaitFroude, [.2, .6], 'gait change Froude');
  // the startle takes tens of milliseconds, never as long as a tenth of a second
  assert(g.escapeLatency.fastest < g.escapeLatency.usual);
  inside(GRIDBUG.startle, [.02, .1], 'startle delay, s');
  inside(g.escapeThreshold, [.005, .03], 'escape threshold, m/s');
  assert(/touching the surface/.test(g.rest) && /turns away/.test(g.escape), 'rests flat, turns away then runs');
  // the wasp's sting goes in at a shallow slant, steeper than a bee's but far from straight down
  assert(g.stingAngle.wasp > g.stingAngle.bee);
  inside(GRIDBUG.stingSlant, [.05, .35], 'sting slant, rad');
  assert(/curve/.test(g.sting), 'the abdomen curls to sting');
  assert(GRIDBUG.dashBL[0] < GRIDBUG.dashBL[1] && GRIDBUG.scuttleHz === g.tripodHz);
});

test('the couatl, ki-rin and angel numbers: a flying snake\'s slow wide wave, a resting coil, a horse\'s levade, a person\'s upright stance and raised arm', () => {
  const a = MEASURES.angelic;
  // the aerial wave is slow and wide: one to two beats a second, a fifth to a third of the body high
  inside(a.glideHz, a.glideHzRange, 'glide wave, Hz'); inside(ANGELIC.glideHz, [1, 2], 'glide wave, Hz');
  inside(a.glideAmplitude, a.glideAmplitudeRange, 'wave height share'); inside(ANGELIC.waveShare, [.15, .4], 'wave height share');
  // it dives steeply first, then glides shallower, and goes forward faster than it sinks
  assert(a.glideAngle < a.diveAngle[0] && a.diveAngle[0] < a.diveAngle[1]);
  assert(Math.abs(Math.atan2(a.glideSpeed.sink, a.glideSpeed.forward) * 180 / Math.PI - a.glideAngle) < 2, 'speeds agree with the glide angle');
  inside(ANGELIC.glidePitch, [.3, .6], 'glide pitch, rad');
  assert(/coiled/.test(a.coil) && a.coiledHoursPerThreat > 100, 'a snake rests coiled, for a long time');
  // the levade is a low rear, lower than the pesade, the forehand well up
  assert(a.levade[1] < a.pesade);
  inside(ANGELIC.rear, [.45, .7], 'levade, rad');
  // an angel stands almost upright: a lean of a few degrees, never a stoop
  inside(ANGELIC.lean, [.02, .1], 'stance lean, rad');
  // the sword arm goes all the way up, past straight overhead is not asked
  assert(a.shoulderFlexionActive <= a.shoulderFlexion);
  inside(ANGELIC.raise, [2.6, Math.PI], 'arm raised overhead, rad');
  inside(a.elbowFlexion[0], [130, 150], 'elbow flexion, degrees');
});

test('the centaur numbers: a horse\'s trot and restless pawing, an archer\'s quick draw and short hold', () => {
  const c = MEASURES.centaur;
  // faster trots come by longer strides, from about 3 to 5 m/s and 2.5 to 3.6 m
  const kinds = ['collected', 'working', 'medium', 'extended'];
  for (let i = 1; i < kinds.length; i++) {
    assert(c.trotSpeed[kinds[i]] > c.trotSpeed[kinds[i - 1]] && c.trotStride[kinds[i]] > c.trotStride[kinds[i - 1]], kinds[i]);
  }
  inside(CENTAUR.trotMid, [3, 5], 'working trot, m/s'); inside(CENTAUR.trotStride, [2.4, 3.6], 'trot stride, m');
  // a trot is a little over one stride a second, faster than the walk's one (Horses)
  inside(CENTAUR.trotHz, [1.2, 1.5], 'trot strides a second');
  assert(CENTAUR.trotHz > HORSE.walkMid / HORSE.strideMid, 'trots quicker than it walks');
  // most horses paw now and then, about a tenth of the time they stand waiting
  inside(c.pawedShare, [.5, .7], 'horses that paw'); inside(CENTAUR.pawShare, [.05, .15], 'time spent pawing');
  assert(c.pawingShare.afternoon > c.pawingShare.morning && /foreleg/.test(c.paw));
  // the draw takes one to two seconds, the hold a few more
  inside(CENTAUR.draw, [.8, 2.5], 'draw, s'); inside(CENTAUR.hold, [2.5, 5], 'hold, s');
  assert(CENTAUR.hold > CENTAUR.draw, 'held longer than drawn');
  // at full draw the drawing arm is up near the horizontal and the elbow folded hard; the elite hold it tighter
  inside(CENTAUR.drawShoulder, [1.5, 2], 'drawing shoulder, rad'); inside(CENTAUR.drawElbow, [2.2, 2.6], 'drawing elbow, rad');
  assert(c.drawShoulder.elite < c.drawShoulder.novice && c.drawElbow.elite < c.drawElbow.novice);
});
