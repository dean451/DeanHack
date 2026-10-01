import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as V from './vampire-sweep.js';

const dt = 1 / 60;
function mon(name, symbol = 'V') { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 1}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const parts = a => [a.body, a.head, ...a.arms, a.cape, ...a.flaps];
const pose = a => [...parts(a).flatMap(o => o.rotation.toArray().slice(0, 3)), ...a.vampireSweep.eyes.scale.toArray()];

test('vampires sweep; wraiths, liches and the generic V get the right kind', () => {
  for (const name of ['vampire', 'vampire lord', 'vampire mage', 'vlad the impaler']) {
    const a = mon(name);
    assert.equal(a.vampire, name);
    assert.equal(a.flaps.length, 2);
    const st = V.updateVampireSweep(a, dt, 0, false);
    assert.ok(st?.eyes?.isGroup, name);
    assert.ok(st.eyes.children.length >= 1, name);
  }
  assert.equal(mon('nosferatu').vampire, 'vampire');
  for (const [name, s] of [['wraith', 'W'], ['lich', 'L'], ['ghost', ' ']]) assert.equal(V.updateVampireSweep(mon(name, s), dt, 0, false), null, name);
});

test('the cape regrouping keeps the rest pose where it was', () => {
  const a = mon('vampire');
  a.g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(a.cape);
  assert.ok(box.min.y > .05 && box.max.y < 1, `cape ${box.min.y}..${box.max.y}`);
  assert.ok(box.max.z < 0, `cape behind (${box.max.z})`);
});

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .005) {
    const p = V.feedPose(u), r = V.strikePose(u);
    for (const v of [...Object.values(p), r.flare, r.bite]) assert.ok(v >= 0 && v <= 1, `${u}`);
  }
  for (const v of Object.values(V.feedPose(1))) assert.equal(v, 0);
  assert.deepEqual(V.strikePose(1), {flare: 0, bite: 0});
  assert.ok(V.feedPose(.26).scent > .99 && V.feedPose(.75).sweep > .99 && V.feedPose(.48).breath > .99);
});

test('a vampire watches, feeds, sweeps its cape, trails it, strikes and rests after death', () => {
  const a = mon('vampire lord');
  a.g.position.set(0, 0, 0);
  const hero = new THREE.Vector3(2, 0, 2);
  const restRot = parts(a).flatMap(o => o.rotation.toArray().slice(0, 3));
  updateFidget(a, 0, 0, false, hero);
  const st = a.vampireSweep, rest = [...restRot, ...st.eyeScale.toArray()];
  let t = 0, feeds = 0, was = false, mist = 0, scent = 0, sweep = 0, turnMax = 0, headMax = 0, eyeMax = 0;
  for (let i = 0; i < 60 * 30; i++) {
    t += dt; updateFidget(a, dt, t, false, hero);
    if (st.feed && !was) feeds++;
    was = !!st.feed;
    mist = Math.max(mist, ...alphas(st.breath));
    scent = Math.max(scent, ...alphas(st.scent));
    assert.ok(finite(st.breath) && finite(st.scent));
    assert.ok(pose(a).every(Number.isFinite));
    sweep = Math.min(sweep, a.arms[1].rotation.x - st.arms[1].x);
    turnMax = Math.max(turnMax, a.body.rotation.y);
    headMax = Math.max(headMax, Math.abs(a.head.rotation.y));
    eyeMax = Math.max(eyeMax, st.eyes.scale.x / st.eyeScale.x);
    assert.ok(Math.abs(a.body.rotation.x - st.body.x) < .3);
    for (const p of [st.breath, st.scent]) {
      const q = p.geometry.attributes.position;
      for (let k = 0; k < q.count; k++) assert.ok(q.getY(k) >= .04 && q.getY(k) < 1.5 && Math.abs(q.getX(k)) < 1 && Math.abs(q.getZ(k)) < 2, `${k}`);
    }
  }
  assert.ok(feeds >= 2, `it feeds (${feeds})`);
  assert.ok(mist > .25, `cold breath (${mist})`);
  assert.ok(scent > .5, `scent thread (${scent})`);
  assert.ok(sweep < -1.3, `the cape sweep (${sweep})`);
  assert.ok(turnMax > .5 && turnMax <= V.BODY_YAW + 1e-6, `turns to the hero (${turnMax})`);
  assert.ok(headMax > .1 && headMax <= V.HEAD_YAW + 1e-6, `head (${headMax})`);
  assert.ok(eyeMax > 1.8 && eyeMax < 2.3, `eyes burn (${eyeMax})`);

  // moving trails the cape back
  st.feed = null;
  let capeMax = 0;
  for (let i = 0; i < 40; i++) { a.g.position.x += 2 * dt; updateFidget(a, dt, t += dt, true, hero); capeMax = Math.max(capeMax, a.cape.rotation.x - st.cape.x); }
  assert.ok(capeMax > .3, `cape trails (${capeMax})`);

  // an attack flares the cape and breathes a gust
  a.actions = {current: {kind: 'attack'}, age: 0, u: .35, queue: []};
  for (let i = 0; i < 6; i++) updateFidget(a, dt, t += dt, true, hero);
  assert.ok(a.flaps[1].rotation.z - st.flaps[1].z > .7 && a.flaps[0].rotation.z - st.flaps[0].z < -.7, 'flaps flare');
  assert.ok(Math.max(...alphas(st.breath)) > .2, 'gust');

  // death: everything back to rest, particles gone
  a.actions = {dead: true, queue: []};
  for (let i = 0; i < 60 * 8; i++) updateFidget(a, dt, t += dt, true, hero);
  const now = pose(a);
  now.forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1e-9, `part ${k}: ${v} vs ${rest[k]}`));
  assert.equal(Math.max(...alphas(st.breath), ...alphas(st.scent)), 0);
});
