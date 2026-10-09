import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as W from './wraith-pull.js';

const dt = 1 / 60;
function mon(name, symbol = ' ') { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 7}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const pose = a => [...a.body.rotation.toArray().slice(0, 3), ...a.head.rotation.toArray().slice(0, 3),
  ...a.arms.flatMap(m => m.rotation.toArray().slice(0, 3)), ...a.claws.flat().map(k => k.rotation.x), ...a.wraithPull.eyes.scale.toArray()];

test('wraiths, barrow wights, Nazgul and the Riders pull; ghosts and liches do not', () => {
  for (const [name, s] of [['wraith', 'W'], ['barrow wight', 'W'], ['nazgul', 'W'], ['death', '&'], ['famine', '&'], ['pestilence', '&']]) {
    const a = mon(name, s);
    assert.equal(a.wraith, name);
    assert.equal(a.claws.length, 2);
    assert.equal(a.claws[0].length, 3);
    const st = W.updateWraithPull(a, dt, 0, false);
    assert.ok(st?.eyes?.isGroup, name);
    assert.ok(st.eyes.children.length >= 1, name);
  }
  for (const [name, s] of [['ghost', ' '], ['lich', 'L']]) assert.equal(W.updateWraithPull(mon(name, s), dt, 0, false), null, name);
});

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .005) {
    const p = W.pullPose(u), r = W.rakePose(u);
    for (const v of [...Object.values(p), r.right, r.left]) assert.ok(v >= 0 && v <= 1, `${u}`);
  }
  for (const v of Object.values(W.pullPose(1))) assert.equal(v, 0);
  assert.deepEqual(W.rakePose(1), {right: 0, left: 0});
  assert.ok(W.pullPose(.45).clench > .99 && W.pullPose(.45).draw > .99);
});

test('a wraith glides, smokes, snaps to the hero, twitches, pulls, rakes and rests after death', () => {
  const a = mon('wraith', 'W');
  a.g.position.set(0, 0, 0);
  const hero = new THREE.Vector3(2, 0, 2);
  updateFidget(a, 0, 0, false, hero);
  const st = a.wraithPull, rest = st.body.x;
  let t = 0, pulls = 0, was = false, smoke = 0, mote = 0, fling = 0, turnMax = 0, headMax = 0, eyeMax = 0, twitches = 0;
  let prev = a.claws[1].map(k => k.rotation.x);
  for (let i = 0; i < 60 * 30; i++) {
    t += dt; updateFidget(a, dt, t, false, hero);
    if (st.pull && !was) pulls++;
    was = !!st.pull;
    smoke = Math.max(smoke, ...alphas(st.smoke).slice(0, W.SMOKE));
    mote = Math.max(mote, ...alphas(st.motes));
    assert.ok(finite(st.smoke) && finite(st.motes));
    assert.ok(pose(a).every(Number.isFinite));
    fling = Math.min(fling, a.arms[0].rotation.x - st.arms[0].x);
    turnMax = Math.max(turnMax, a.body.rotation.y);
    headMax = Math.max(headMax, Math.abs(a.head.rotation.y));
    eyeMax = Math.max(eyeMax, st.eyes.scale.x);
    const now = a.claws[1].map(k => k.rotation.x);
    if (now.some((v, k) => Math.abs(v - prev[k]) > .02)) twitches++;
    prev = now;
    assert.ok(Math.abs(a.body.rotation.x - rest) < .4);
    for (const k of a.claws.flat()) assert.ok(Math.abs(k.rotation.x) < 1.01);
    for (const p of [st.smoke, st.motes]) {
      const q = p.geometry.attributes.position;
      for (let k = 0; k < q.count; k++) assert.ok(q.getY(k) >= .04 && q.getY(k) < 1.6 && Math.abs(q.getX(k)) < 1 && Math.abs(q.getZ(k)) < 1.6, `${k}`);
    }
  }
  assert.ok(pulls >= 2, `it pulls (${pulls})`);
  assert.ok(smoke > .2, `hem smoke (${smoke})`);
  assert.ok(mote > .5, `the thread (${mote})`);
  assert.ok(fling < -.5, `the claw flings out (${fling})`);
  assert.ok(turnMax > .5 && turnMax <= W.BODY_YAW + W.SWAY + 1e-6, `turns to the hero (${turnMax})`);
  assert.ok(headMax > .1 && headMax <= W.HEAD_YAW + 1e-6, `head (${headMax})`);
  assert.ok(eyeMax > 1.8 && eyeMax < 2.6, `eyes blaze (${eyeMax})`);
  assert.ok(twitches > 60, `claws twitch (${twitches})`);

  // an attack rakes both claws and gusts smoke ahead
  st.pull = null;
  a.actions = {current: {kind: 'attack'}, age: 0, u: .2, queue: []};
  for (let i = 0; i < 6; i++) updateFidget(a, dt, t += dt, true, hero);
  assert.ok(a.arms[1].rotation.x - st.arms[1].x < -.4);
  assert.ok(Math.max(...alphas(st.smoke).slice(W.SMOKE)) > .1);

  // death eases everything back to the exact rest pose
  a.actions = {current: null, dead: true, queue: []};
  for (let i = 0; i < 60 * 8; i++) updateFidget(a, dt, t += dt, false, hero);
  assert.equal(a.body.rotation.x, st.body.x);
  assert.equal(a.body.rotation.y, st.body.y);
  assert.equal(a.head.rotation.y, st.head.y);
  a.arms.forEach((m, i) => { assert.equal(m.rotation.x, st.arms[i].x); assert.equal(m.rotation.z, st.arms[i].z); });
  st.fingers.flat().forEach(f => assert.equal(f.k.rotation.x, f.x));
  assert.equal(st.eyes.scale.x, st.eyeScale.x);
  assert.equal(Math.max(...alphas(st.smoke), ...alphas(st.motes)), 0);
});

test('two wraiths are out of step, and the looks differ', () => {
  const a = mon('wraith', 'W'), b = mon('wraith', 'W');
  for (let i = 0; i < 120; i++) { W.updateWraithPull(a, dt, i * dt, false); W.updateWraithPull(b, dt, i * dt, false); }
  assert.notEqual(a.body.rotation.z, b.body.rotation.z);
  assert.notDeepEqual(W.LOOKS.nazgul.smoke, W.LOOKS.wraith.smoke);
  assert.ok(W.LOOKS['barrow wight'].alpha < W.LOOKS.wraith.alpha);
});

test('each Rider has its own gait and colours, and rests exactly after death', () => {
  const hero = new THREE.Vector3(1.5, 0, 2);
  const run = name => {
    const a = mon(name, '&');
    a.g.position.set(0, 0, 0);
    updateFidget(a, 0, 0, false, hero);
    const st = a.wraithPull;
    let t = 0, pulls = 0, was = false, twitches = 0, roll = 0, hunch = 0, mote = 0, smoke = 0;
    let prev = a.claws[0].map(k => k.rotation.x);
    for (let i = 0; i < 60 * 40; i++) {
      t += dt; updateFidget(a, dt, t, false, hero);
      if (st.pull && !was) pulls++;
      was = !!st.pull;
      assert.ok(pose(a).every(Number.isFinite) && finite(st.smoke) && finite(st.motes), name);
      const now = a.claws[0].map(k => k.rotation.x);
      if (!st.pull && now.some((v, k) => Math.abs(v - prev[k]) > .02)) twitches++;
      prev = now;
      if (!st.pull) roll = Math.max(roll, Math.abs(a.body.rotation.z - st.body.z));
      assert.ok(Math.abs(a.body.rotation.z - st.body.z) < .2, name);
      if (!st.pull) hunch = Math.max(hunch, a.body.rotation.x - st.body.x);
      mote = Math.max(mote, ...alphas(st.motes));
      smoke = Math.max(smoke, ...alphas(st.smoke).slice(0, W.SMOKE));
      assert.ok(Math.abs(a.body.rotation.x - st.body.x) < .45, name);
    }
    assert.ok(pulls >= 2 && mote > .5 && smoke > .1, `${name} pulls (${pulls}, ${mote}, ${smoke})`);
    a.actions = {current: null, dead: true, queue: []};
    for (let i = 0; i < 60 * 8; i++) updateFidget(a, dt, t += dt, false, hero);
    assert.equal(a.body.rotation.x, st.body.x);
    assert.equal(a.body.rotation.z, st.body.z);
    a.arms.forEach((m, i) => assert.equal(m.rotation.x, st.arms[i].x));
    st.fingers.flat().forEach(f => assert.equal(f.k.rotation.x, f.x));
    assert.equal(Math.max(...alphas(st.smoke), ...alphas(st.motes)), 0);
    return {st, twitches, roll, hunch};
  };
  const d = run('death'), f = run('famine'), p = run('pestilence');
  assert.equal(d.st.look, W.LOOKS.death);
  assert.equal(f.st.look, W.LOOKS.famine);
  assert.equal(p.st.look, W.LOOKS.pestilence);
  assert.ok(f.twitches > 2 * d.twitches, `Famine is restless, Death patient (${f.twitches} vs ${d.twitches})`);
  assert.ok(p.roll > 1.8 * d.roll, `Pestilence lurches (${p.roll} vs ${d.roll})`);
  assert.ok(f.hunch > 2.5 * d.hunch, `Famine stoops (${f.hunch} vs ${d.hunch})`);
  assert.ok(W.LOOKS.pestilence.alpha > W.LOOKS.death.alpha);
});

test('after the shudder the pull cocks the head over to savour it, then lets it go', () => {
  assert.equal(W.pullPose(.8).savor, 0);
  assert.ok(W.pullPose(.9).savor > .99);
  assert.equal(W.pullPose(.99).savor, 0);
  const a = mon('wraith', 'W');
  updateFidget(a, 0, 0, false, null);
  const st = a.wraithPull, rest = st.head.z;
  let tilt = 0, t = 0;
  st.wait = 0;
  for (let i = 0; i < 60 * 8; i++) {
    t += dt; updateFidget(a, dt, t, false, null);
    if (st.pull) tilt = Math.max(tilt, a.head.rotation.z - rest);
  }
  assert.ok(tilt > W.SAVOR_TILT * .8, `${tilt}`);
});

test('the flung claw snatches at the air twice before it closes, within bounds', () => {
  const f = u => W.pullPose(u).fling;
  assert.ok(f(.36) < f(.3) - .05 && f(.36) < f(.4) - .05, 'first snatch');
  assert.ok(f(.46) < f(.4) - .05 && f(.46) < f(.5) - .05, 'second snatch');
  assert.equal(W.pullPose(1).fling, 0);
});
