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

test('only the Executioner, Croesus, One-eyed Sam, the miner, the black marketeer, the mugger and the convict are lit, each with its own glow material', () => {
  for (const name of ['jackal', 'minotaur', 'ninja']) assert.equal(E.updateEyeFlare(createCreature({name}), dt, 0, false), null, name);
  const a = make('executioner'), b = make('executioner'), shared = a.eyes.material;
  assert.ok(shared === b.eyes.material);
  E.updateEyeFlare(a, dt, 0, false); E.updateEyeFlare(b, dt, 0, false);
  assert.ok(a.eyes.material !== shared && a.eyes.material !== b.eyes.material);
  assert.equal(shared.emissiveIntensity, 1.8);
  assert.ok(E.hasEyes(make('croesus')) && E.hasEyes(make('one-eyed sam')) && E.hasEyes(make('miner')) && E.hasEyes(make('black marketeer')) && E.hasEyes(make('mugger')) && E.hasEyes(make('convict')));
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
  for (const name of ['executioner', 'croesus', 'one-eyed sam', 'miner', 'black marketeer', 'mugger', 'convict']) {
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
