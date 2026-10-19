import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FUR} from './feline-coat.js';
import {createSkinnedFeline, updateSkinnedFeline, chainWeights, CLIPS, SIT_AFTER, POUNCE, TURN, BLINK, SIT} from './feline-skin.js';
import {STEP, strideAt, spineAt} from './feline-gait.js';
import {simulateGait, analyseGait} from './cat-measure.js';
import {REFERENCE} from './cat-reference.js';
import {slideTo, FELINE_GLIDE} from './slide.js';
import {createFeline} from './feline.js';

// feline-skin.js: the pet cat as one skinned mesh over a small skeleton (a trial of skinning).
test('chain weights blend softly across joints and always sum to one', () => {
  const j = [0, 1, 2];
  assert.deepEqual(chainWeights(.5, j, .1), [[0, 1]]);
  assert.deepEqual(chainWeights(1.5, j, .1), [[1, 1]]);
  const mid = chainWeights(1, j, .1); assert.equal(mid.length, 2); assert.ok(Math.abs(mid[0][1] - .5) < 1e-6 && Math.abs(mid[0][1] + mid[1][1] - 1) < 1e-9);
  const down = chainWeights(-.5, [0, -1, -2], .1); assert.deepEqual(down, [[0, 1]], 'a chain can run downward');
  assert.deepEqual(chainWeights(9, j, .1), [[1, 1]], 'past the end: the last bone');
});

test('the skinned cat is two skinned meshes over one skeleton, weighted, bound at rest, standing on the floor with the rigid cat\'s footprint', () => {
  for (const name of ['kitten', 'housecat', 'large cat']) {
    const a = createSkinnedFeline(name), rigid = createFeline(name);
    const skinned = [], shells = []; a.g.traverse(o => { if (o.isSkinnedMesh) (o.userData.part === 'fur-shell' ? shells : skinned).push(o); });
    assert.equal(skinned.length, 3, `${name}: fur, details, eyes`); assert.equal(shells.length, FUR.shells, `${name}: the fur's layers`); assert.ok(shells.every(m => m.skeleton === skinned[0].skeleton && m.geometry === a.fur.geometry), 'the layers are the skin again, on the same bones'); assert.ok(skinned.every(m => m.skeleton === skinned[0].skeleton));
    assert.equal(skinned[0].skeleton.bones.length, 28, 'hips, spine, chest, neck, head, 5 tail, 3+4 per side, two ears, the jaw and the tongue');
    for (const m of skinned) {
      const w = m.geometry.attributes.skinWeight, idx = m.geometry.attributes.skinIndex;
      assert.ok(w && idx, 'skin attributes');
      for (let i = 0; i < w.count; i++) { const sum = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i); assert.ok(Math.abs(sum - 1) < 1e-4, `${name} vertex ${i} weights sum ${sum}`); for (const k of [idx.getX(i), idx.getY(i), idx.getZ(i), idx.getW(i)]) assert.ok(k >= 0 && k < 28); }
    }
    // at rest the skinned mesh sits where the rigid parts sit
    a.g.updateMatrixWorld(true); rigid.g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a.g, true), rb = new THREE.Box3().setFromObject(rigid.g, true);
    assert.ok(Math.abs(box.min.y - rb.min.y) < .02, `${name} on the floor ${box.min.y} vs ${rb.min.y}`);
    assert.ok(Math.abs(box.max.y - rb.max.y) < .05 && Math.abs(box.max.z - rb.max.z) < .05 && Math.abs(box.min.z - rb.min.z) < .05, `${name} footprint`);
    assert.ok(a.asset?.update && a.asset.mixer && a.head?.isBone && a.legs.length === 0 && a.tail === null, 'drives itself through asset.update on a mixer; the head bone takes the glance code');
    assert.deepEqual(a.fur.userData.color.length, 3, 'remembers its coat for the death burst');
  }
});

test('the clips: idle, sit, loaf, curl, tail and pounce are sampled from pose functions into seamless looping tracks on the bones they name', () => {
  const a = createSkinnedFeline('housecat'), {actions} = a.animator;
  assert.deepEqual(Object.keys(actions).sort(), ['curl', 'idle', 'loaf', 'pounce', 'sit', 'stretch', 'tail'], 'walking, trotting and galloping are stepped, not clips');
  const tail = actions.tail.getClip(), idle = actions.idle.getClip(), sit = actions.sit.getClip();
  const names = c => c.tracks.map(t => t.name);
  assert.ok(names(tail).every(n => n.startsWith('tail')) && names(tail).length === 5, 'the tail clip touches only the tail bones');
  assert.ok(names(idle).includes('chest.scale') && !names(idle).some(n => n.startsWith('head')), 'idle breathes; the head is left to the glance code');
  assert.ok(names(idle).includes('spine.quaternion') && names(idle).includes('chest.quaternion'), 'idle always writes the spine and chest, so the lean never accumulates');
  for (const c of [idle, tail, sit, actions.loaf.getClip(), actions.curl.getClip()]) for (const t of c.tracks) { const n = t.getValueSize(); for (let k = 0; k < n; k++) assert.ok(Math.abs(t.values[k] - t.values[t.values.length - n + k]) < 1e-6, `${c.name} ${t.name} loops seamlessly`); }
});

// The cat faces its path (live.js turns an actor toward its step), moving along +x at `hs` hip heights a second.
const walkFor = (a, frames, hs, walking = true) => { let r; a.g.rotation.y = Math.PI / 2; const v = hs * a.animator.stepper.hip(); for (let i = 0; i < frames; i++) { a.g.position.x += v / 60; a.slideSpeed = walking ? v : 0; r = updateSkinnedFeline(a, 1 / 60, null, walking); } return r; };
const tipOf = (a, L) => { a.g.updateMatrixWorld(true); const e = L.bones[L.bones.length - 1]; return L.leg.tip.clone().applyMatrix4(e.matrixWorld); };

test('walking steps the legs over the idle: the step fades in, lifts the paws in the cat\'s order and bobs the hips; a stop lands every paw before the idle takes back over', () => {
  const a = createSkinnedFeline('housecat'), r = a.rig, {actions} = a.animator, st = a.animator.stepper;
  a.g.rotation.y = Math.PI / 2; updateSkinnedFeline(a, 1 / 60, null, false); // face the path first
  let s = walkFor(a, 2, 2.8);
  assert.ok(s.stepWeight > 0 && s.stepWeight < 1, `fading in ${s.stepWeight}`);
  s = walkFor(a, 30, 2.8);
  assert.equal(s.stepWeight, 1); assert.equal(s.gait, 'walk'); assert.equal(actions.idle.getEffectiveWeight(), 1, 'over the idle clip');
  // the paws leave the ground in turn: left hind, left fore, right hind, right fore
  const lifts = []; let was = Object.fromEntries(Object.values(st.legs).map(L => [L.key, L.stance]));
  let low = Infinity, high = -Infinity;
  for (let i = 0; i < 120; i++) { walkFor(a, 1, 2.8); for (const L of Object.values(st.legs)) { if (was[L.key] && !L.stance) lifts.push(L.key); was[L.key] = L.stance; } low = Math.min(low, r.hips.position.y); high = Math.max(high, r.hips.position.y); }
  const i0 = lifts.indexOf('lhind'); assert.deepEqual(lifts.slice(i0, i0 + 4), ['lhind', 'lfore', 'rhind', 'rfore']);
  assert.ok(high - low > .002, 'the hips bob');
  // stop: no more lifts, the swinging paws land, then the idle has the legs again
  s = updateSkinnedFeline(a, 1 / 60, null, false); a.slideSpeed = 0;
  let frames = 0; while (s.step.stepping && frames < 120) { s = updateSkinnedFeline(a, 1 / 60, null, false); frames++; }
  assert.ok(frames < 60, `all four paws down within ${frames} frames`);
  assert.ok(Object.values(st.legs).every(L => L.stance), 'standing on four planted paws');
  for (let i = 0; i < 30; i++) s = updateSkinnedFeline(a, 1 / 60, null, false);
  assert.equal(s.stepWeight, 0); assert.equal(s.gait, 'idle');
  assert.ok(Math.abs(r.legs.lfore.bones[0].rotation.x) < .02 && Math.abs(r.hips.position.y - r.hips.userData.world[1]) < 1e-3, 'standing: the legs back on the idle and the hips where they rest');
  const t1 = r.tail[3].rotation.y; for (let i = 0; i < 20; i++) updateSkinnedFeline(a, 1 / 60, null, false);
  assert.notEqual(t1, r.tail[3].rotation.y, 'the tail keeps swaying at rest');
  assert.ok(r.chest.scale.x !== 1 || r.chest.scale.y !== 1, 'and the chest breathes');
});

test('a turn leans the spine toward the new heading, on top of the clips', () => {
  const a = createSkinnedFeline('kitten'), r = a.rig;
  for (let i = 0; i < 10; i++) updateSkinnedFeline(a, 1 / 60, null, true);
  a.g.rotation.y += .4; for (let i = 0; i < 5; i++) updateSkinnedFeline(a, 1 / 60, null, true);
  assert.ok(r.lean > .05, `leans ${r.lean}`);
  for (let i = 0; i < 120; i++) updateSkinnedFeline(a, 1 / 60, null, true);
  assert.ok(Math.abs(r.lean) < .02, 'and straightens out');
});

test('a pet that stands still long enough sits down, and gets up the moment it walks', () => {
  const a = createSkinnedFeline('kitten'), {actions} = a.animator;
  for (let t = 0; t < SIT_AFTER - .5; t += 1 / 60) updateSkinnedFeline(a, 1 / 60, null, false);
  assert.equal(actions.sit.getEffectiveWeight(), 0, 'not yet');
  let r; for (let t = 0; t < 2; t += 1 / 60) r = updateSkinnedFeline(a, 1 / 60, null, false);
  assert.ok(r.sitting && actions.sit.getEffectiveWeight() === 1 && actions.idle.getEffectiveWeight() === 0, 'sat');
  assert.ok(a.rig.hips.position.y < a.rig.hips.userData.world[1] - .05, 'the haunches are down');
  assert.ok(a.rig.legs.lhind.bones[1].rotation.x > .5 && a.rig.hips.rotation.x + a.rig.legs.lhind.bones[0].rotation.x < -.8, 'the hind legs are folded forward (the pelvis tipped back and the thigh forward)');
  for (let i = 0; i < 40; i++) r = updateSkinnedFeline(a, 1 / 60, null, true);
  assert.ok(!r.sitting && r.step.stepping && r.stepWeight === 1 && actions.sit.getEffectiveWeight() === 0, 'up and walking');
  // the sit clip is a loop; the pounce is a one-shot
  assert.ok(!CLIPS.sit.once && CLIPS.pounce.once);
});

test('an attack action plays the pounce once, over whatever the pet was doing, then fades back', () => {
  const a = createSkinnedFeline('housecat'), {actions} = a.animator;
  a.actions = {current: null};
  for (let i = 0; i < 30; i++) updateSkinnedFeline(a, 1 / 60, null, true);
  const attack = {kind: 'attack'}; a.actions.current = attack;
  let r = updateSkinnedFeline(a, 1 / 60, null, true);
  assert.ok(r.pouncing, 'the pounce starts with the attack');
  let reached = false, left = false;
  for (let t = 0; t < POUNCE.time * .9; t += 1 / 60) { r = updateSkinnedFeline(a, 1 / 60, null, false); if (actions.pounce.getEffectiveWeight() === 1) reached = true; if (a.rig.legs.lfore.bones[0].rotation.x < -.5) reached = reached && true; if (a.rig.hips.position.y > a.rig.hips.userData.world[1] + .03) left = true; }
  assert.ok(reached && left, 'full weight, forelegs reaching, hips off the ground');
  for (let t = 0; t < 1; t += 1 / 60) r = updateSkinnedFeline(a, 1 / 60, null, false);
  assert.ok(!r.pouncing && actions.pounce.getEffectiveWeight() === 0 && actions.idle.getEffectiveWeight() === 1, 'back to idle after the pounce');
  // the same attack object does not pounce twice; a new one does
  for (let i = 0; i < 5; i++) r = updateSkinnedFeline(a, 1 / 60, null, false); assert.ok(!r.pouncing);
  a.actions.current = {kind: 'attack'}; r = updateSkinnedFeline(a, 1 / 60, null, false); assert.ok(r.pouncing);
});

test('show() holds one clip at a moment of its cycle for the tool pages', () => {
  const a = createSkinnedFeline('kitten');
  a.animator.show('sit', .5);
  assert.ok(a.rig.hips.position.y < a.rig.hips.userData.world[1] - .05);
  a.animator.show('pounce', .5);
  assert.ok(a.rig.legs.lfore.bones[0].rotation.x < -.5, 'the forelegs reach in the leap');
});

test('the stride follows the speed, in hip heights: the walk lengthens its stride and shortens the stance with speed, the swing holds, and past the trot band it trots', () => {
  const walk = strideAt(2.8), quick = strideAt(3.8), trot = strideAt(6);
  assert.ok(Math.abs(walk.length - STEP.stride) < 1e-9 && quick.length > walk.length, 'longer strides when quicker');
  assert.ok(quick.duty < walk.duty && trot.duty <= .5, 'each paw stands for less of the stride, down to a trot\'s half');
  for (const s of [walk, quick, trot]) assert.ok(Math.abs(s.period * (1 - s.duty) - STEP.swing) < 1e-9, 'the swing time holds');
  assert.equal(walk.diagonality, .25); assert.equal(trot.diagonality, .5);
  // a cap from the legs' reach shortens the stride, never the swing
  const capped = strideAt(2.8, 1, .5); assert.ok(capped.length * capped.duty <= .5 + 1e-9 && Math.abs(capped.period * (1 - capped.duty) - STEP.swing) < 1e-9);
});

test('past the trot the stride slides into a gallop: the stride rate holds near 3 a second, the hind paws land a tenth of a stride apart, the spine gathers and stretches, and every paw leaves the floor once a stride', () => {
  const trot = strideAt(STEP.gallopFrom - .5), gallop = strideAt(STEP.gallopTo + 1), faster = strideAt(STEP.gallopTo + 5);
  assert.equal(trot.gallop, 0); assert.equal(gallop.gallop, 1);
  assert.ok(Math.abs(1 / gallop.period - STEP.gallopHz) < .01 && Math.abs(1 / faster.period - STEP.gallopHz) < .01, 'the stride rate holds; the stride lengthens');
  assert.ok(Math.abs(gallop.offsets.rhind - STEP.gallopHind) < 1e-9 && Math.abs(gallop.offsets.lfore - STEP.gallopLead) < 1e-9);
  // the paws' stances leave a gap: a flight
  const down = u => Object.values(gallop.offsets).some(o => ((u - o) % 1 + 1) % 1 < gallop.duty);
  let air = 0; for (let i = 0; i < 1000; i++) if (!down(i / 1000)) air++;
  assert.ok(air > 20, `in the air ${air / 10}% of the stride`);
  assert.equal(spineAt(0), -1, 'gathered as the hind paws land'); assert.ok(Math.abs(spineAt(STEP.gallopLead) - 1) < 1e-9, 'stretched as the fore paws land');
  // and in motion: the spine slides the hips and chest apart and back
  const a = createSkinnedFeline('housecat'), r = a.rig, rest = r.spine.position.z; let lo = Infinity, hi = -Infinity, s;
  for (let i = 0; i < 120; i++) { s = walkFor(a, 1, STEP.gallopTo + 2); if (i > 40) { lo = Math.min(lo, r.spine.position.z); hi = Math.max(hi, r.spine.position.z); } }
  assert.equal(s.gait, 'gallop'); assert.equal(s.stepWeight, 1);
  assert.ok(hi - lo > STEP.stretch * .2, `the spine stretches ${(hi - lo).toFixed(3)}`);
  // slowing to a walk, it walks again
  s = walkFor(a, 90, 2.8); assert.equal(s.gait, 'walk');
  assert.ok(Math.abs(r.spine.position.z - rest) < 1e-6, `and the spine is back at its rest length: ${r.spine.position.z}`);
});

test('a planted paw stays put and no paw goes through the floor, kitten and housecat, walking, trotting and galloping', () => {
  for (const name of ['kitten', 'housecat']) for (const hs of [2.8, 6, 12]) {
    const a = createSkinnedFeline(name), st = a.animator.stepper, h = st.hip(); walkFor(a, 60, hs);
    let worst = 0, lowest = Infinity, checked = 0;
    for (let i = 0; i < 180; i++) { walkFor(a, 1, hs); for (const L of Object.values(st.legs)) { const p = tipOf(a, L); lowest = Math.min(lowest, p.y); if (L.stance && L.plant) { worst = Math.max(worst, p.distanceTo(L.plant)); checked++; } } }
    assert.ok(checked > 100, 'stance frames were checked');
    assert.ok(worst < .02 * h, `${name} at ${hs} h/s: a standing paw stays within ${(worst / h).toFixed(4)} h of where it landed`);
    assert.ok(lowest > -.01 * h, `${name} at ${hs} h/s: lowest paw ${(lowest / h).toFixed(4)} h`);
  }
});

// The walk held to the reference cat (cat-motion/README.md), as tools/cat-lab.html measures it.
test('the walk meets the reference cat at a calm pace: the footfall order, diagonality, time each paw stands, swing time, paws on the floor and a steady head', () => {
  const R = REFERENCE.walk;
  for (const name of ['kitten', 'housecat']) {
    const an = analyseGait(simulateGait({name, ms: .65, seconds: 3, hull: false}));
    assert.deepEqual(an.order, ['lhind', 'lfore', 'rhind', 'rfore'], `${name} order`);
    assert.ok(an.diagonality >= R.diagonality[0] && an.diagonality <= R.diagonality[1], `${name} diagonality ${an.diagonality}`);
    for (const d of an.duty) assert.ok(d >= R.duty[0] && d <= R.duty[1], `${name} duty ${d}`);
    assert.ok(an.swingS >= .17 && an.swingS <= R.swingS[1], `${name} swing ${an.swingS}`);
    for (const c of an.plantedCm) assert.ok(c >= R.plantedCm[0] && c <= R.plantedCm[1], `${name} standing paw ${c} cm`);
    for (const c of an.lowestCm) assert.ok(c >= R.lowestCm[0], `${name} lowest paw ${c} cm`);
    assert.ok(an.headTravelCm >= R.headTravelCm[0] * .9 && an.headTravelCm <= R.headTravelCm[1], `${name} head bob ${an.headTravelCm} cm`);
    assert.ok(an.headPitchDeg <= R.headPitchDeg[1], `${name} head pitch ${an.headPitchDeg}`);
  }
});

test('a turn: the body counters the heading step and eases round, the neck leads, and the tail trails late then settles', () => {
  // `b` walks the same frames without the turn, so the tail's own clip can be subtracted out
  const a = createSkinnedFeline('housecat'), b = createSkinnedFeline('housecat');
  for (let i = 0; i < 90; i++) { walkFor(a, 1, 2.8); walkFor(b, 1, 2.8); } // the first frame saw the heading set, and has eased round since
  assert.ok(Math.abs(a.body.rotation.y) < 1e-3, 'straight ahead: no counter-turn');
  a.g.rotation.y = Math.PI / 2 + 1; // the heading jumps a radian to the left
  updateSkinnedFeline(a, 1 / 60, null, true); updateSkinnedFeline(b, 1 / 60, null, true);
  assert.ok(a.body.rotation.y < -.8, `the body counters the step: ${a.body.rotation.y}`);
  const neck = new THREE.Euler().setFromQuaternion(a.rig.neck.quaternion);
  assert.ok(neck.y > .2, `the neck leads into the turn: ${neck.y}`);
  const tailAt = c => new THREE.Euler().setFromQuaternion(c.rig.tail[4].quaternion).y, extra = () => tailAt(a) - tailAt(b);
  let peak = 0, peakAt = 0;
  for (let i = 1; i <= 60; i++) { updateSkinnedFeline(a, 1 / 60, null, true); updateSkinnedFeline(b, 1 / 60, null, true); const y = extra(); if (Math.abs(y) > Math.abs(peak)) { peak = y; peakAt = i; } }
  assert.ok(peakAt > 2 && peakAt < 30, `the tail swings late: peak at frame ${peakAt}`);
  assert.ok(peak < -.05, `and trails the turn: ${peak}`);
  assert.ok(Math.abs(a.body.rotation.y) < .01, 'a second later the body has come round');
  for (let i = 0; i < 90; i++) { updateSkinnedFeline(a, 1 / 60, null, true); updateSkinnedFeline(b, 1 / 60, null, true); }
  assert.ok(Math.abs(extra()) < .02, `and the tail has settled back onto its clip: ${extra()}`);
});

test('the eyes blink: shut for a moment every few seconds, open the rest of the time', () => {
  const a = createSkinnedFeline('kitten');
  let shut = 0, blinks = 0, was = true;
  for (let i = 0; i < 60 * 20; i++) { updateSkinnedFeline(a, 1 / 60, null, false); const open = a.eyes.visible; if (!open) shut++; if (was && !open) blinks++; was = open; }
  assert.ok(blinks >= 2 && blinks <= 9, `${blinks} blinks in 20 s`);
  assert.ok(shut / (60 * 20) < .06, 'the eyes are open almost all the time');
  assert.ok(shut / blinks >= BLINK.shut * 60 * .8, 'each blink lasts about the shut time');
});

test('the gallop meets the reference cat: stride rate, swing time, a flight every stride, hind paws a tenth of a stride apart, paws on the floor', () => {
  const R = REFERENCE.gallop;
  const an = analyseGait(simulateGait({name: 'housecat', ms: 2.8, seconds: 3, hull: false}));
  assert.deepEqual(an.gaits, ['gallop']);
  assert.ok(an.strideHz >= R.strideHz[0] && an.strideHz <= R.strideHz[1], `stride rate ${an.strideHz}`);
  assert.ok(an.swingS >= R.swingS[0] && an.swingS <= R.swingS[1], `swing ${an.swingS}`);
  assert.ok(an.flight >= R.flight[0] && an.flight <= R.flight[1], `flight ${an.flight}`);
  assert.ok(an.hindLag >= R.hindLag[0] && an.hindLag <= R.hindLag[1], `hind paws ${an.hindLag} apart`);
  for (const c of an.plantedCm) assert.ok(c < .5, `standing paw ${c} cm`);
  for (const c of an.lowestCm) assert.ok(c >= -.3, `lowest paw ${c} cm`);
});

// A pet following the hero: a tile a step, gliding (slide.js) the way live.js moves it.
const stepTiles = (a, steps, gap = .6) => { const out = []; a.target = a.target || a.g.position.clone(); a.g.rotation.y = Math.PI / 2;
  for (let s = 0; s < steps; s++) { a.target.x += 1; for (let f = 0; f < gap * 60; f++) { slideTo(a, 1 / 60); const moving = a.g.position.distanceTo(a.target) > .025; out.push(updateSkinnedFeline(a, 1 / 60, null, moving)); } }
  return out; };

test('a pet walks to the next tile at a cat\'s pace, and hurries only as it falls behind: a trot, then a gallop, then back to a walk as it closes in', () => {
  const a = createSkinnedFeline('kitten');
  assert.equal(a.glide, FELINE_GLIDE, 'the cat glides tile to tile at its own pace');
  const one = stepTiles(a, 1, 3).filter(r => r.walking);
  assert.ok(one.length > 60 && one.every(r => r.gait === 'walk'), `one tile is a walk: ${[...new Set(one.map(r => r.gait))]}`);
  const h = a.animator.stepper.hip(), cruise = Math.max(...one.map(r => r.speed));
  assert.ok(Math.abs(cruise / h - FELINE_GLIDE.pace[0][1]) < .3, `at the walk's ${FELINE_GLIDE.pace[0][1]} h/s: ${(cruise / h).toFixed(2)}`);
  // the hero runs on: the target gets ahead and the cat speeds up through its gaits
  const run = stepTiles(a, 8, .25).filter(r => r.walking), seen = [...new Set(run.map(r => r.gait))];
  assert.deepEqual(seen, ['walk', 'trot', 'gallop'], `walk, then trot, then gallop: ${seen}`);
  let r; for (let i = 0; i < 60 * 6; i++) { slideTo(a, 1 / 60); r = updateSkinnedFeline(a, 1 / 60, null, a.g.position.distanceTo(a.target) > .002); }
  assert.ok(a.g.position.distanceTo(a.target) < .01 && !r.step.stepping, 'and it arrives and stands');
});

test('the sit has the cat\'s feet under it: hind feet just behind the front paws, hocks on the floor, the back rising steeply', () => {
  const a = createSkinnedFeline('kitten'); a.animator.show('sit', .5); a.g.updateMatrixWorld(true);
  const wp = b => b.getWorldPosition(new THREE.Vector3()), L = a.rig.legs;
  const fp = wp(L.lfore.bones[2]), hp = wp(L.lhind.bones[3]), hock = wp(L.lhind.bones[2]), hips = wp(a.rig.hips), chest = wp(a.rig.chest);
  assert.ok(hp.z < fp.z && fp.z - hp.z < .1, `hind foot ${(fp.z - hp.z).toFixed(3)} behind the front paw`);
  assert.ok(hock.y < .05 && hp.y < .05 && fp.y < .05, 'paws and hocks down on the floor');
  const pitch = Math.atan2(chest.y - hips.y, chest.z - hips.z) * 180 / Math.PI;
  assert.ok(pitch > 30, `the back rises ${pitch.toFixed(0)} degrees`);
  assert.ok(SIT.hz > 0, 'the haunches slide forward under the body');
});

test('left alone, a pet settles: it sits, lies down, turns a circle and curls up asleep with its eyes shut, and walking gets it straight up', () => {
  for (const name of ['kitten', 'housecat']) {
    const a = createSkinnedFeline(name), seen = new Set(); let r, slept = 0, circled = false, turned = 0, last = a.g.rotation.y;
    for (let t = 0; t < 600 && slept < 2; t += 1 / 30) {
      r = updateSkinnedFeline(a, 1 / 30, null, false); seen.add(r.rest);
      turned += Math.abs(a.g.rotation.y - last); last = a.g.rotation.y; if (r.rest === 'circle') circled = true;
      if (r.asleep > .99) slept += 1 / 30;
    }
    assert.ok(seen.has('sit') && (seen.has('loaf') || seen.has('curl')), `${name} sat and lay down: ${[...seen]}`);
    assert.ok(slept >= 2, `${name} fell asleep`); assert.ok(circled && turned > 5, `${name} turned a circle first (${turned.toFixed(1)} rad)`);
    assert.equal(a.eyes.visible, false, 'eyes shut asleep');
    // a walk: up within a second
    let up = 0; for (; up < 2; up += 1 / 30) { r = updateSkinnedFeline(a, 1 / 30, null, true); if (r.asleep < .05 && r.lying < .05) break; }
    assert.ok(up < 1.05, `${name} up and walking in ${up.toFixed(2)} s`);
  }
});

test('waking on its own, a pet stretches (forelegs out, rump up) and yawns (mouth wide, eyes shut) before it stands', () => {
  const a = createSkinnedFeline('kitten'); let r, woke = false, jaw = 0, shut = false, low = Infinity, stood = false;
  for (let t = 0; t < 900 && !stood; t += 1 / 30) {
    r = updateSkinnedFeline(a, 1 / 30, null, false);
    if (r.rest === 'stretch') { woke = true; jaw = Math.max(jaw, a.rig.jaw.rotation.x); if (a.rig.jaw.rotation.x > .5 && !a.eyes.visible) shut = true; a.g.updateMatrixWorld(true); low = Math.min(low, a.rig.chest.getWorldPosition(new THREE.Vector3()).y); }
    if (woke && r.rest === 'stand') stood = true;
  }
  assert.ok(woke && stood, 'woke, stretched and stood');
  assert.ok(jaw > .7 && shut, `yawned wide (${jaw.toFixed(2)}) with its eyes shut`);
  const standing = createSkinnedFeline('kitten'); standing.g.updateMatrixWorld(true);
  assert.ok(low < standing.rig.chest.getWorldPosition(new THREE.Vector3()).y - .03, 'the chest went down in the bow');
});
