import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSkinnedFeline, updateSkinnedFeline, chainWeights, WALK, RUN, GAIT, CLIPS, SIT_AFTER, POUNCE, TURN, BLINK} from './feline-skin.js';
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
    const skinned = []; a.g.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
    assert.equal(skinned.length, 3, `${name}: fur, details, eyes`); assert.ok(skinned.every(m => m.skeleton === skinned[0].skeleton));
    assert.equal(skinned[0].skeleton.bones.length, 24, 'hips, spine, chest, neck, head, 5 tail, 3+4 per side');
    for (const m of skinned) {
      const w = m.geometry.attributes.skinWeight, idx = m.geometry.attributes.skinIndex;
      assert.ok(w && idx, 'skin attributes');
      for (let i = 0; i < w.count; i++) { const sum = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i); assert.ok(Math.abs(sum - 1) < 1e-4, `${name} vertex ${i} weights sum ${sum}`); for (const k of [idx.getX(i), idx.getY(i), idx.getZ(i), idx.getW(i)]) assert.ok(k >= 0 && k < 24); }
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

test('the clips: walk, idle and tail are sampled from pose functions into seamless looping tracks on the bones they name', () => {
  const a = createSkinnedFeline('housecat'), {actions} = a.animator;
  assert.deepEqual(Object.keys(actions).sort(), ['idle', 'pounce', 'run', 'sit', 'tail', 'walk']);
  const walk = actions.walk.getClip(), tail = actions.tail.getClip(), idle = actions.idle.getClip();
  assert.ok(Math.abs(walk.duration - 1 / WALK.hz) < 1e-9);
  const names = c => c.tracks.map(t => t.name);
  assert.ok(names(walk).includes('lfore0.quaternion') && names(walk).includes('rhind3.quaternion') && names(walk).includes('hips.position') && names(walk).includes('spine.quaternion'));
  assert.ok(names(tail).every(n => n.startsWith('tail')) && names(tail).length === 5, 'the tail clip touches only the tail bones');
  assert.ok(names(idle).includes('chest.scale') && !names(idle).some(n => n.startsWith('head')), 'idle breathes; the head is left to the glance code');
  for (const c of [walk, idle]) assert.ok(names(c).includes('spine.quaternion') && names(c).includes('chest.quaternion'), `${c.name} always writes the spine and chest, so the lean never accumulates`);
  for (const c of [walk, idle, tail]) for (const t of c.tracks) { const n = t.getValueSize(); for (let k = 0; k < n; k++) assert.ok(Math.abs(t.values[k] - t.values[t.values.length - n + k]) < 1e-6, `${c.name} ${t.name} loops seamlessly`); }
  assert.ok(CLIPS.walk.frames >= 16);
});

test('walking cross-fades the walk in and the idle out, swings and bends the legs in diagonal pairs and bobs the hips; stopping fades back and the tail keeps moving', () => {
  const a = createSkinnedFeline('housecat'), r = a.rig, {actions} = a.animator;
  assert.equal(actions.idle.getEffectiveWeight(), 1); assert.equal(actions.walk.getEffectiveWeight(), 0);
  updateSkinnedFeline(a, 1 / 60, null, true); updateSkinnedFeline(a, 1 / 60, null, true);
  const w = actions.walk.getEffectiveWeight(); assert.ok(w > 0 && w < 1, `mid cross-fade ${w}`);
  for (let i = 0; i < 60; i++) updateSkinnedFeline(a, 1 / 60, null, true);
  assert.equal(actions.walk.getEffectiveWeight(), 1); assert.equal(actions.idle.getEffectiveWeight(), 0);
  const lf = r.legs.lfore.bones[0].rotation.x, rh = r.legs.rhind.bones[0].rotation.x, rf = r.legs.rfore.bones[0].rotation.x;
  assert.ok(Math.abs(lf) > .05, 'the legs swing'); assert.ok(Math.sign(lf) === Math.sign(rh) && Math.sign(lf) !== Math.sign(rf), 'diagonal pairs');
  let bent = false, bobbed = false; for (let i = 0; i < 30; i++) { updateSkinnedFeline(a, 1 / 60, null, true); if (Math.abs(r.legs.lfore.bones[1].rotation.x) > .1) bent = true; if (r.hips.position.y > r.hips.userData.world[1] + .005) bobbed = true; }
  assert.ok(bent, 'the elbow bends on the lift'); assert.ok(bobbed, 'the hips bob');
  for (let i = 0; i < 60; i++) updateSkinnedFeline(a, 1 / 60, null, false);
  assert.equal(actions.idle.getEffectiveWeight(), 1); assert.equal(actions.walk.getEffectiveWeight(), 0);
  assert.ok(Math.abs(r.legs.lfore.bones[0].rotation.x) < .02 && Math.abs(r.hips.position.y - r.hips.userData.world[1]) < 1e-3, 'standing: the legs settle and the hips come down');
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
  assert.ok(a.rig.legs.lhind.bones[1].rotation.x > .5 && a.rig.legs.lhind.bones[0].rotation.x < -.8, 'the hind legs are folded forward');
  for (let i = 0; i < 40; i++) r = updateSkinnedFeline(a, 1 / 60, null, true);
  assert.ok(!r.sitting && actions.walk.getEffectiveWeight() === 1 && actions.sit.getEffectiveWeight() === 0, 'up and walking');
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
  a.animator.show('walk', .25);
  assert.ok(Math.abs(a.rig.hips.position.y - a.rig.hips.userData.world[1]) < .02 && Math.abs(a.rig.legs.lfore.bones[0].rotation.x) > .1);
});

// The three tricks from three's skinning-blending example.
// The cat faces its path (live.js turns an actor toward its step), moving along +x.
const walkFor = (a, frames, tilesPerSecond, walking = true) => { let r; a.g.rotation.y = Math.PI / 2; for (let i = 0; i < frames; i++) { a.g.position.x += tilesPerSecond / 60; r = updateSkinnedFeline(a, 1 / 60, null, walking); } return r; };

test('the walk\'s stride rate follows the measured speed, within bounds', () => {
  const a = createSkinnedFeline('housecat');
  let r = walkFor(a, 60, .2);
  assert.equal(r.gait, 'walk'); assert.equal(+r.timeScale.toFixed(2), GAIT.minScale, 'a creep is clamped at the slow end');
  assert.ok(Math.abs(GAIT.nominal - GAIT.stride.walk * WALK.hz) < 1e-9, 'one cycle per stride: the phase follows distance');
  r = walkFor(a, 60, GAIT.nominal);
  assert.ok(Math.abs(r.timeScale - 1) < .1, `nominal speed, stride rate about 1: ${r.timeScale}`);
  r = walkFor(a, 60, 3);
  assert.ok(r.timeScale > 1.1 && r.timeScale <= GAIT.maxScale, `quicker: ${r.timeScale}`);
});

test('past the run speed the walk warps into the run and back below it warps out; run and walk share phase so the warp can', () => {
  const a = createSkinnedFeline('kitten'), {actions} = a.animator;
  let r = walkFor(a, 60, 2);
  assert.equal(r.gait, 'walk');
  r = walkFor(a, 90, GAIT.runAt + 2);
  assert.equal(r.gait, 'run'); assert.equal(actions.run.getEffectiveWeight(), 1); assert.equal(actions.walk.getEffectiveWeight(), 0);
  assert.ok(r.timeScale <= GAIT.maxScale);
  r = walkFor(a, 90, GAIT.walkAt - 1.5);
  assert.equal(r.gait, 'walk'); assert.equal(actions.walk.getEffectiveWeight(), 1); assert.equal(actions.run.getEffectiveWeight(), 0);
  assert.ok(RUN.hz > WALK.hz && RUN.swing > WALK.swing);
  // both cycles put the same leg forward at the same phase
  const {walkPose, runPose} = {walkPose: CLIPS.walk.pose, runPose: CLIPS.run.pose};
  for (const u of [0, .25, .5, .75]) assert.equal(Math.sign(walkPose(u).lfore0.x || 0), Math.sign(runPose(u).lfore0.x || 0), `phase ${u}`);
});

test('a stop waits for the stride\'s loop boundary before fading to idle, so the feet are planted; walking again cancels the stop', () => {
  const a = createSkinnedFeline('housecat'), {actions} = a.animator;
  walkFor(a, 40, 2);
  let r = updateSkinnedFeline(a, 1 / 60, null, false);
  assert.ok(r.stopping && actions.walk.getEffectiveWeight() === 1, 'the frame after the halt the walk is still at full weight');
  let frames = 0; while (actions.walk.getEffectiveWeight() > 0 && frames < 90) { r = updateSkinnedFeline(a, 1 / 60, null, false); frames++; }
  assert.ok(frames > 2 && frames < 90, `faded out after the loop boundary (${frames} frames)`); assert.equal(r.gait, 'idle');
  walkFor(a, 40, 2);
  r = updateSkinnedFeline(a, 1 / 60, null, false); assert.ok(r.stopping);
  r = walkFor(a, 5, 2);
  assert.ok(!r.stopping && r.gait === 'walk' && actions.walk.getEffectiveWeight() === 1, 'walking again cancels the stop');
});

// How far a planted paw drifts along the ground while it should be standing: the sum, over a
// walk, of each stance-phase frame's paw movement in world space.
const footSlide = (a, tilesPerSecond, frames = 240) => {
  const E = a.rig.legs.lfore.bones[2], p = new THREE.Vector3(), last = new THREE.Vector3(); let slide = 0, stanceFrames = 0;
  for (let i = 0; i < 60; i++) walkFor(a, 1, tilesPerSecond); // settle into the walk
  for (let i = 0; i < frames; i++) {
    walkFor(a, 1, tilesPerSecond); a.g.updateMatrixWorld(true); E.getWorldPosition(p);
    const base = a.animator.actions[a.animator.base], u = base.time / base.getClip().duration, stance = -Math.cos(u * Math.PI * 2);
    if (stance > .3) { if (stanceFrames) slide += Math.abs(p.x - last.x); stanceFrames++; } else stanceFrames = 0;
    last.copy(p);
  }
  return slide;
};

test('a planted foot stays put: the stance-phase paw drifts a fraction of what it did skating, and the leg still reaches it', () => {
  const free = createSkinnedFeline('kitten'); free.animator.planting = false;
  const pinned = createSkinnedFeline('kitten');
  const before = footSlide(free, .5), after = footSlide(pinned, .5);
  assert.ok(after < before * .35, `slide ${after.toFixed(3)} with planting vs ${before.toFixed(3)} without`);
  // the solver really puts the paw on the pin
  const leg = pinned.rig.legs.lfore, E = leg.bones[2]; let checked = 0;
  for (let i = 0; i < 120; i++) { walkFor(pinned, 1, .5); if (leg.plant) { pinned.g.updateMatrixWorld(true); const p = E.getWorldPosition(new THREE.Vector3()); const base = pinned.animator.actions[pinned.animator.base], u = base.time / base.getClip().duration; if (-Math.cos(u * Math.PI * 2) > .6) { assert.ok(p.distanceTo(leg.plant) < .012, `paw ${p.distanceTo(leg.plant).toFixed(4)} from its pin`); checked++; } } }
  assert.ok(checked > 10, 'stance frames were checked');
  // nothing is pinned once the cat stands still or sits
  for (let i = 0; i < 90; i++) walkFor(pinned, 1, 0, false);
  assert.ok(Object.values(pinned.rig.legs).every(l => !l.plant));
});

test('a turn: the body counters the heading step and eases round, the neck leads, and the tail trails late then settles', () => {
  // `b` walks the same frames without the turn, so the tail's own clip can be subtracted out
  const a = createSkinnedFeline('housecat'), b = createSkinnedFeline('housecat');
  for (let i = 0; i < 90; i++) { walkFor(a, 1, 1); walkFor(b, 1, 1); } // the first frame saw the heading set, and has eased round since
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
