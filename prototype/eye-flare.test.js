import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import * as E from './eye-flare.js';

const dt = 1 / 60;
const make = name => { const a = createCreature({name}); a.actions = createActionQueue(); a.g.updateMatrixWorld(true); return a; };

function frame(a, t, look) {
  clearActionPose(a, a.actions);
  const busy = !!a.actions.current || !!a.actions.queue.length;
  const st = E.updateEyeFlare(a, dt, t, busy, look);
  updateActions(a, a.actions, dt);
  return st;
}
const glow = a => a.eyes.material.emissiveIntensity;

test('only the Executioner, Croesus, One-eyed Sam, the miner, the black marketeer, the mugger, the convict, Thoth Amon, Charon and the prisoner are lit, each with its own glow material', () => {
  for (const name of ['jackal', 'minotaur', 'ninja']) assert.equal(E.updateEyeFlare(createCreature({name}), dt, 0, false), null, name);
  const a = make('executioner'), b = make('executioner'), shared = a.eyes.material;
  assert.ok(shared === b.eyes.material);
  E.updateEyeFlare(a, dt, 0, false); E.updateEyeFlare(b, dt, 0, false);
  assert.ok(a.eyes.material !== shared && a.eyes.material !== b.eyes.material);
  assert.equal(shared.emissiveIntensity, 1.8);
  assert.ok(E.hasEyes(make('croesus')) && E.hasEyes(make('one-eyed sam')) && E.hasEyes(make('miner')) && E.hasEyes(make('black marketeer')) && E.hasEyes(make('mugger')) && E.hasEyes(make('convict')) && E.hasEyes(make('thoth amon')) && E.hasEyes(make('charon')) && E.hasEyes(make('prisoner')));
});

test('the curves are bounded and quiet outside their spans', () => {
  for (const v of [-1, 0, 1, 2, NaN]) { assert.equal(E.attackCurve(v), 0); assert.equal(E.blinkCurve(v), 1); assert.equal(E.holdCurve(v), 0); }
  let hi = 0, lo = 1;
  for (let v = 0; v <= 1; v += .005) {
    hi = Math.max(hi, E.attackCurve(v)); lo = Math.min(lo, E.blinkCurve(v));
    for (const x of [E.attackCurve(v), E.blinkCurve(v), E.holdCurve(v)]) assert.ok(x >= 0 && x <= 1);
  }
  assert.ok(hi > .95 && lo < .15);
});

test('idle, near the hero and in an attack: finite, eyes stay put, and the attack blazes', () => {
  for (const name of ['executioner', 'croesus', 'one-eyed sam', 'miner', 'black marketeer', 'mugger', 'convict', 'thoth amon', 'charon', 'prisoner']) {
    const a = make(name), hero = new THREE.Vector3(1, 0, 2), far = new THREE.Vector3(30, 0, 30);
    const centre = () => { a.g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(a.eyes); return b.getCenter(new THREE.Vector3()); };
    const c0 = centre();
    let t = 0, idleMax = 0, nearMean = 0, farMean = 0, glints = 0, was = false;
    for (let i = 0; i < 20 * 60; i++) { const st = frame(a, t += dt, far); farMean += glow(a); idleMax = Math.max(idleMax, glow(a)); if (st.glint !== null && !was) glints++; was = st.glint !== null; }
    const farGlints = glints; glints = 0;
    for (let i = 0; i < 20 * 60; i++) {
      const st = frame(a, t += dt, hero); nearMean += glow(a);
      if (st.glint !== null && !was) glints++; was = st.glint !== null;
      assert.ok(Number.isFinite(glow(a)) && [a.eyes.scale.x, a.eyes.scale.y, a.eyes.position.x].every(Number.isFinite));
      assert.ok(centre().distanceTo(c0) < .02, `${name} eyes stay in their sockets`);
    }
    assert.ok(nearMean > farMean, `${name} brighter near the hero`);
    if (E.LOOK[name].glintLen) assert.ok(glints > farGlints, `glints ${farGlints} → ${glints}`);
    enqueueAction(a.actions, {kind: 'attack', attack: 'weapon', dir: [0, 1]});
    let peak = 0;
    for (let i = 0; i < 60; i++) { frame(a, t += dt, hero); peak = Math.max(peak, glow(a)); }
    assert.ok(peak > idleMax * 1.2 && peak > 2.5 * farMean / (20 * 60), `${name} attack ${peak} vs idle ${idleMax}`);
  }
});

test('a blow blinks then angers; the eyes come back to rest', () => {
  const a = make('executioner'), far = new THREE.Vector3(30, 0, 30);
  let t = 0;
  for (let i = 0; i < 60; i++) frame(a, t += dt, far);
  enqueueAction(a.actions, {kind: 'hit', dir: [0, 1], attack: 'weapon'});
  let shut = 1, angry = 0;
  for (let i = 0; i < 90; i++) { frame(a, t += dt, far); shut = Math.min(shut, a.eyes.scale.y); angry = Math.max(angry, a.eyeFlare.anger); }
  assert.ok(shut < .2 && angry > .5);
  for (let i = 0; i < 10 * 60; i++) frame(a, t += dt, far);
  assert.ok(a.eyeFlare.anger === 0 && Math.abs(a.eyes.scale.x - 1) < 1e-9);
});

test("Sam's eye squints with the hero near and opens again when they go", () => {
  const a = make('one-eyed sam'), hero = new THREE.Vector3(1, 0, 1), far = new THREE.Vector3(30, 0, 30);
  let t = 0;
  for (let i = 0; i < 5 * 60; i++) frame(a, t += dt, hero);
  const st = a.eyeFlare;
  assert.ok(st.near > .99);
  if (st.glare === null && st.blink === null) assert.ok(Math.abs(a.eyes.scale.y - .7) < .02, `squint ${a.eyes.scale.y}`);
  for (let i = 0; i < 8 * 60; i++) frame(a, t += dt, far);
  assert.ok(st.near < 1e-3);
  for (let i = 0; i < 2 * 60 && st.glare !== null; i++) frame(a, t += dt, far);
  assert.ok(Math.abs(a.eyes.scale.y - 1) < .01 && Math.abs(a.eyes.scale.x - 1) < 1e-9);
});

test('death gutters the eyes out; stone holds them', () => {
  const a = make('croesus');
  let t = 0;
  for (let i = 0; i < 60; i++) frame(a, t += dt, null);
  enqueueAction(a.actions, {kind: 'die', dir: null, style: 'fall'});
  for (let i = 0; i < 8 * 60; i++) frame(a, t += dt, null);
  assert.equal(glow(a), 0);
  assert.ok(Math.abs(a.eyes.scale.y - E.DEATH_Y) < 1e-6);
  const b = make('executioner');
  for (let i = 0; i < 30; i++) frame(b, t += dt, null);
  const k = glow(b), s = b.eyes.scale.clone();
  b.stone = {k: 1};
  for (let i = 0; i < 60; i++) E.updateEyeFlare(b, dt, t += dt, false, null);
  assert.ok(glow(b) === k && b.eyes.scale.equals(s));
});

test("the miner's eyes droop now and then, and stare wide with the hero near", () => {
  const a = make('miner'), hero = new THREE.Vector3(1, 0, 1), far = new THREE.Vector3(30, 0, 30);
  let t = 0, droops = 0, was = false, low = 1;
  for (let i = 0; i < 20 * 60; i++) {
    const st = frame(a, t += dt, far);
    if (st.glare !== null && !was) droops++; was = st.glare !== null;
    low = Math.min(low, a.eyes.scale.y);
  }
  assert.ok(droops >= 3 && low < .3, `droops ${droops}, lowest ${low}`);
  let wide = 0;
  for (let i = 0; i < 6 * 60; i++) { frame(a, t += dt, hero); wide = Math.max(wide, a.eyes.scale.y); }
  assert.ok(a.eyeFlare.near > .99 && wide > 1.2, `stare ${wide}`);
  for (let i = 0; i < 8 * 60; i++) frame(a, t += dt, far);
  assert.ok(a.eyeFlare.near < .01);
});

test("the black marketeer's eyes flick about alone and fix on the hero when near", () => {
  const a = make('black marketeer'), hero = new THREE.Vector3(1, 0, 1), far = new THREE.Vector3(30, 0, 30);
  let t = 0;
  const run = (look, secs) => {
    let looks = 0, last = a.eyeFlare?.dartTo, wide = 0;
    for (let i = 0; i < secs * 60; i++) {
      const st = frame(a, t += dt, look);
      if (st.dartTo !== last) looks++; last = st.dartTo;
      wide = Math.max(wide, Math.abs(st.dartTo));
    }
    return {looks, wide};
  };
  run(far, 2);
  const alone = run(far, 20);
  run(hero, 4);
  const near = run(hero, 20);
  assert.ok(alone.looks > 3 * near.looks, `looks ${alone.looks} alone vs ${near.looks} near`);
  assert.ok(alone.wide > .003 && near.wide < .0015, `dart ${alone.wide} alone vs ${near.wide} near`);
  const st = a.eyeFlare;
  if (st.glare === null && st.blink === null && st.glint === null) assert.ok(Math.abs(a.eyes.scale.y - .75) < .02, `half-lidded ${a.eyes.scale.y}`);
  run(far, 8);
  for (let i = 0; i < 2 * 60 && st.glare !== null; i++) frame(a, t += dt, far);
  assert.ok(st.near < 1e-3 && Math.abs(a.eyes.scale.y - 1) < .01);
});

test("the mugger glares alone, and with the hero near glances down and aside at their pack, then back", () => {
  const a = make('mugger'), hero = new THREE.Vector3(1, 0, 1), far = new THREE.Vector3(30, 0, 30);
  const st0 = E.updateEyeFlare(a, 0, 0, false, far), rest = st0.pos.clone();
  let t = 0, glances = 0, was = false, drop = 0, side = 0;
  for (let i = 0; i < 20 * 60; i++) { const st = frame(a, t += dt, far); assert.equal(st.glint, null); }
  for (let i = 0; i < 30 * 60; i++) {
    const st = frame(a, t += dt, hero);
    if (st.glint !== null && !was) glances++; was = st.glint !== null;
    // centre offset from rest, undoing the scale-about-centre term
    const dy = a.eyes.position.y - (rest.y + st.c.y * (1 - a.eyes.scale.y)), dx = a.eyes.position.x - (rest.x + st.c.x * (1 - a.eyes.scale.x));
    drop = Math.min(drop, dy); side = Math.max(side, Math.abs(dx));
    assert.ok(dy <= 1e-12 && dy >= -E.LOOK.mugger.glintDrop - 1e-9 && Math.abs(dx) < .0035, `stays in the eyehole ${dx} ${dy}`);
  }
  assert.ok(glances >= 4, `glances ${glances}`);
  assert.ok(drop < -.004 && side > .0008, `drop ${drop}, side ${side}`);
  if (a.eyeFlare.glare === null && a.eyeFlare.blink === null && a.eyeFlare.glint === null) assert.ok(Math.abs(a.eyes.scale.y - .65) < .02, `narrowed ${a.eyes.scale.y}`);
  for (let i = 0; i < 10 * 60; i++) frame(a, t += dt, far);
  const st = a.eyeFlare;
  for (let i = 0; i < 2 * 60 && (st.glare !== null || st.glint !== null); i++) frame(a, t += dt, far);
  assert.ok(st.near < 1e-3 && st.glance === 0 && Math.abs(a.eyes.scale.y - 1) < .01);
  assert.ok(Math.abs(a.eyes.position.y - rest.y) < 1e-9, `back to rest ${a.eyes.position.y - rest.y}`);
});

test("the convict's eyes flick alone, go wide and cut aside with the hero near, and follow its look over the shoulder", () => {
  const a = make('convict'), hero = new THREE.Vector3(1, 0, 1), far = new THREE.Vector3(30, 0, 30), L = E.LOOK.convict;
  const st0 = E.updateEyeFlare(a, 0, 0, false, far), rest = st0.pos.clone();
  const offset = st => [a.eyes.position.x - (rest.x + st.c.x * (1 - a.eyes.scale.x)), a.eyes.position.y - (rest.y + st.c.y * (1 - a.eyes.scale.y))];
  let t = 0;
  const run = (look, secs, extra) => {
    let looks = 0, last = a.eyeFlare.dartTo, starts = 0, glances = 0, wasG = false, wasS = false, wide = 0, hiY = 0, hiX = 0, up = 0;
    for (let i = 0; i < secs * 60; i++) {
      extra?.(i);
      const st = frame(a, t += dt, look);
      if (st.dartTo !== last) looks++; last = st.dartTo;
      if (st.glare !== null && !wasS) starts++; wasS = st.glare !== null;
      if (st.glint !== null && !wasG) glances++; wasG = st.glint !== null;
      const [dx, dy] = offset(st);
      wide = Math.max(wide, Math.abs(st.dartTo)); hiY = Math.max(hiY, a.eyes.scale.y); hiX = Math.max(hiX, Math.abs(dx)); up = Math.max(up, dy);
      assert.ok(Math.abs(dx) <= L.xMax + 1e-12 && dy >= -1e-12 && dy <= -L.glintDrop + 1e-12, `stays in the socket ${dx} ${dy}`);
      assert.ok(a.eyes.scale.y <= L.nearY * L.glareY * L.atkY + 1e-9, `not too wide ${a.eyes.scale.y}`);
    }
    return {looks, starts, glances, wide, hiY, hiX, up};
  };
  const alone = run(far, 20);
  assert.ok(alone.looks > 35 && alone.starts >= 3 && alone.hiY > 1.25, `alone ${JSON.stringify(alone)}`);
  run(hero, 4);
  const near = run(hero, 30);
  assert.ok(near.looks > alone.looks && near.wide > alone.wide && near.glances >= 6 && near.up > .0009, `near ${JSON.stringify(near)}`);
  const st = a.eyeFlare;
  if (st.glare === null && st.blink === null) assert.ok(a.eyes.scale.y > 1.15, `wide ${a.eyes.scale.y}`);
  // a head turn over the shoulder: the eyes go to that corner
  run(far, 8);
  let lead = 0;
  run(far, 3, i => { a.convictHunted = {applied: {yaw: 1.05 * Math.min(1, i / 10)}}; });
  for (let i = 0; i < 60; i++) { frame(a, t += dt, far); lead += offset(st)[0]; }
  assert.ok(lead / 60 > .0015, `follows the look ${lead / 60}`);
  a.convictHunted = {applied: {yaw: 0}};
  for (let i = 0; i < 4 * 60 && (st.glare !== null || st.glint !== null || i < 60); i++) frame(a, t += dt, far);
  assert.ok(st.near < 1e-3 && st.glance === 0 && Math.abs(a.eyes.scale.y - 1) < .01);
  assert.ok(Math.abs(offset(st)[0] - st.dart) < 1e-12 && Math.abs(st.dart) <= L.dart + 1e-9, 'only the idle flick left');
});

test("Thoth Amon's eyes hold still, draw to slits and throb with the hero near, and flash wide with sorcery", () => {
  const a = make('thoth amon'), hero = new THREE.Vector3(1, 0, 1), far = new THREE.Vector3(30, 0, 30), L = E.LOOK['thoth amon'];
  const st0 = E.updateEyeFlare(a, 0, 0, false, far), rest = st0.pos.clone();
  let t = 0;
  const run = (look, secs) => {
    let lo = Infinity, hi = 0, slitLo = Infinity, slitHi = 0, flashes = 0, was = false, wide = 0;
    for (let i = 0; i < secs * 60; i++) {
      const st = frame(a, t += dt, look);
      assert.equal(st.dart, 0);
      assert.ok(Math.abs(a.eyes.position.x - (rest.x + st.c.x * (1 - a.eyes.scale.x))) < 1e-12, 'never darts');
      assert.ok(a.eyes.scale.y > 0 && a.eyes.scale.y <= L.glintY + 1e-9 && Number.isFinite(glow(a)));
      if (st.glint !== null && !was) flashes++; was = st.glint !== null;
      wide = Math.max(wide, a.eyes.scale.y);
      if (st.glare === null && st.glint === null && st.blink === null) {
        lo = Math.min(lo, st.k); hi = Math.max(hi, st.k);
        slitLo = Math.min(slitLo, a.eyes.scale.y); slitHi = Math.max(slitHi, a.eyes.scale.y);
      }
    }
    return {throb: (hi - lo) / (hi + lo), flashes, wide, slitLo, slitHi};
  };
  const alone = run(far, 30);
  run(hero, 4);
  const near = run(hero, 30);
  assert.ok(near.throb > 1.8 * alone.throb, `throb ${alone.throb} alone vs ${near.throb} near`);
  assert.ok(Math.abs(near.slitLo - L.nearY) < .02 && Math.abs(near.slitHi - L.nearY) < .02, `slits ${near.slitLo}..${near.slitHi}`);
  assert.ok(near.flashes > alone.flashes && near.flashes >= 4, `flashes ${alone.flashes} → ${near.flashes}`);
  assert.ok(near.wide > .75 && alone.wide > 1.4, `flash opens the slits ${near.wide}, ${alone.wide}`);
  run(far, 8);
  const st = a.eyeFlare;
  for (let i = 0; i < 3 * 60 && (st.glare !== null || st.glint !== null); i++) frame(a, t += dt, far);
  assert.ok(st.near < 1e-3 && Math.abs(a.eyes.scale.y - 1) < .01 && Math.abs(a.eyes.scale.x - 1) < 1e-9);
});

test("Charon's coals bank in a weary droop alone, and are fanned with the hero near: brighter, fiercer, narrowed, with slow flares", () => {
  const a = make('charon'), hero = new THREE.Vector3(1, 0, 1), far = new THREE.Vector3(30, 0, 30), L = E.LOOK.charon;
  const st0 = E.updateEyeFlare(a, 0, 0, false, far), rest = st0.pos.clone();
  let t = 0;
  const run = (look, secs) => {
    let lo = Infinity, hi = 0, sum = 0, n = 0, droops = 0, droopLo = Infinity, flares = 0, was = false, wasG = false, lidLo = Infinity, lidHi = 0;
    for (let i = 0; i < secs * 60; i++) {
      const st = frame(a, t += dt, look);
      assert.equal(st.dart, 0);
      assert.ok(Math.abs(a.eyes.position.x - (rest.x + st.c.x * (1 - a.eyes.scale.x))) < 1e-12, 'never darts');
      assert.ok(a.eyes.scale.y > 0 && a.eyes.scale.y <= 1 + 1e-9 && Number.isFinite(glow(a)));
      if (st.glint !== null && !was) flares++; was = st.glint !== null;
      if (st.glare !== null && !wasG) droops++; wasG = st.glare !== null;
      if (st.glare !== null) droopLo = Math.min(droopLo, a.eyes.scale.y);
      if (st.glare === null && st.glint === null && st.blink === null) {
        lo = Math.min(lo, st.k); hi = Math.max(hi, st.k); sum += st.k; n++;
        lidLo = Math.min(lidLo, a.eyes.scale.y); lidHi = Math.max(lidHi, a.eyes.scale.y);
      }
    }
    return {flicker: (hi - lo) / (hi + lo), mean: sum / n, droops, droopLo, flares, lidLo, lidHi};
  };
  const alone = run(far, 30);
  run(hero, 4);
  const near = run(hero, 30);
  assert.ok(alone.droops >= 3 && alone.droopLo < L.glareY + .03, `droops ${alone.droops} to ${alone.droopLo}`);
  assert.ok(near.mean > 1.3 * alone.mean, `fanned ${alone.mean} → ${near.mean}`);
  assert.ok(near.flicker > 1.2 * alone.flicker, `flicker ${alone.flicker} alone vs ${near.flicker} near`);
  assert.ok(Math.abs(near.lidLo - L.nearY) < .02 && Math.abs(near.lidHi - L.nearY) < .02, `narrowed ${near.lidLo}..${near.lidHi}`);
  assert.ok(near.flares > alone.flares && near.flares >= 4, `flares ${alone.flares} → ${near.flares}`);
  run(far, 8);
  const st = a.eyeFlare;
  for (let i = 0; i < 3 * 60 && (st.glare !== null || st.glint !== null); i++) frame(a, t += dt, far);
  assert.ok(st.near < 1e-3 && Math.abs(a.eyes.scale.y - 1) < .01 && Math.abs(a.eyes.scale.x - 1) < 1e-9);
});

test("the prisoner's eyes wander and sag alone, and with the hero near stare wide, flick jumpily and cringe shut, down and aside", () => {
  const a = make('prisoner'), hero = new THREE.Vector3(1, 0, 1), far = new THREE.Vector3(30, 0, 30), L = E.LOOK.prisoner;
  const st0 = E.updateEyeFlare(a, 0, 0, false, far), rest = st0.pos.clone();
  let t = 0;
  const run = (look, secs) => {
    let sum = 0, n = 0, sags = 0, sagLo = Infinity, cringes = 0, was = false, wasG = false, lidLo = Infinity, lidHi = 0;
    let cringeLo = Infinity, cringeGlow = Infinity, drop = 0, dartHi = 0, moves = 0, lastTo = 0;
    for (let i = 0; i < secs * 60; i++) {
      const st = frame(a, t += dt, look);
      const dx = a.eyes.position.x - (rest.x + st.c.x * (1 - a.eyes.scale.x)), dy = a.eyes.position.y - (rest.y + st.c.y * (1 - a.eyes.scale.y));
      assert.ok(Math.abs(dx) <= L.xMax + 1e-12 && dy <= 1e-12 && dy >= -L.glintDrop - 1e-9, `stays in the socket ${dx} ${dy}`);
      assert.ok(a.eyes.scale.y > 0 && Number.isFinite(glow(a)));
      if (st.dartTo !== lastTo) { moves++; lastTo = st.dartTo; }
      if (st.glint !== null && !was) cringes++; was = st.glint !== null;
      if (st.glare !== null && !wasG) sags++; wasG = st.glare !== null;
      if (st.glare !== null) sagLo = Math.min(sagLo, a.eyes.scale.y);
      if (st.glint !== null && st.glare === null) { cringeLo = Math.min(cringeLo, a.eyes.scale.y); cringeGlow = Math.min(cringeGlow, st.k); drop = Math.max(drop, -dy); }
      if (st.glare === null && st.glint === null && st.blink === null) {
        sum += st.k; n++; dartHi = Math.max(dartHi, Math.abs(dx));
        lidLo = Math.min(lidLo, a.eyes.scale.y); lidHi = Math.max(lidHi, a.eyes.scale.y);
      }
    }
    return {mean: sum / n, sags, sagLo, cringes, cringeLo, cringeGlow, drop, dartHi, moves: moves / secs, lidLo, lidHi};
  };
  const alone = run(far, 30);
  run(hero, 4);
  const near = run(hero, 30);
  assert.ok(alone.sags >= 3 && alone.sagLo < L.glareY + .03, `sags ${alone.sags} to ${alone.sagLo}`);
  assert.equal(alone.cringes, 0);
  assert.ok(alone.lidHi < 1.01 && alone.dartHi > .001 && alone.dartHi <= L.dart + 1e-9, `alone ${alone.lidHi} ${alone.dartHi}`);
  assert.ok(near.mean > 1.15 * alone.mean, `brighter ${alone.mean} → ${near.mean}`);
  assert.ok(near.lidHi > L.nearY - .02, `wide ${near.lidHi}`);
  assert.ok(near.moves > 2 * alone.moves && near.dartHi > alone.dartHi, `jumpy ${alone.moves}/s → ${near.moves}/s`);
  assert.ok(near.cringes >= 5, `cringes ${near.cringes}`);
  assert.ok(near.cringeLo < .5 && near.cringeGlow < .7 * near.mean && near.drop > .8 * L.glintDrop, `cringe ${near.cringeLo} ${near.cringeGlow} ${near.drop}`);
  run(far, 8);
  const st = a.eyeFlare;
  for (let i = 0; i < 3 * 60 && (st.glare !== null || st.glint !== null); i++) frame(a, t += dt, far);
  assert.ok(st.near < 1e-3 && Math.abs(a.eyes.scale.y - 1) < .01 && Math.abs(a.eyes.scale.x - 1) < 1e-9);
});
