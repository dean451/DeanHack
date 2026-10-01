import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as G from './ghost-drift.js';

const dt = 1 / 60;
function mon(name, symbol = ' ') { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 7}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const pose = a => [...a.body.rotation.toArray().slice(0, 3), ...a.head.rotation.toArray().slice(0, 3),
  ...a.arms.flatMap(m => m.rotation.toArray().slice(0, 3)), ...a.ghostDrift.eyes.scale.toArray()];

test('ghosts and shades drift; nothing else does', () => {
  for (const name of ['ghost', 'shade']) {
    const a = mon(name);
    assert.equal(a.ghost, name);
    const st = G.updateGhostDrift(a, dt, 0, false);
    assert.ok(st?.eyes?.isMesh, name);
  }
  for (const [name, s] of [['wraith', 'W'], ['lich', 'L'], ['floating eye', 'e']]) assert.equal(G.updateGhostDrift(mon(name, s), dt, 0, false), null, name);
});

test('poses stay in bounds', () => {
  for (let u = -.1; u <= 1.1; u += .01) {
    const d = G.drainPose(u);
    for (const v of [d.reach, d.lean, d.flare, d.draw, d.shudder, G.lungePose(u)]) assert.ok(v >= 0 && v <= 1, `${u}`);
  }
  assert.deepEqual(G.drainPose(1), {reach: 0, lean: 0, flare: 0, draw: 0, shudder: 0});
  assert.equal(G.lungePose(1), 0);
});

test('a ghost sways, smokes, follows the hero, drains, lunges and rests after death', () => {
  const a = mon('ghost');
  a.g.position.set(0, 0, 0);
  const hero = new THREE.Vector3(2, 0, 2);// ahead and to its left-front (+x)
  updateFidget(a, 0, 0, false, hero);
  const st = a.ghostDrift, rest = st.body.x;
  let t = 0, drains = 0, was = false, smoke = 0, mote = 0, reachMin = 0, turnMax = 0, headMax = 0, eyeMax = 0, roll = [9, -9];
  for (let i = 0; i < 60 * 30; i++) {
    t += dt; updateFidget(a, dt, t, false, hero);
    if (st.drain && !was) drains++;
    was = !!st.drain;
    smoke = Math.max(smoke, ...alphas(st.smoke).slice(0, G.SMOKE));
    mote = Math.max(mote, ...alphas(st.motes));
    assert.ok(finite(st.smoke) && finite(st.motes));
    assert.ok(pose(a).every(Number.isFinite));
    reachMin = Math.min(reachMin, a.arms[1].rotation.x - st.arms[1].x);
    turnMax = Math.max(turnMax, a.body.rotation.y);
    headMax = Math.max(headMax, a.head.rotation.y);
    eyeMax = Math.max(eyeMax, st.eyes.scale.x);
    roll = [Math.min(roll[0], a.body.rotation.z), Math.max(roll[1], a.body.rotation.z)];
    assert.ok(Math.abs(a.body.rotation.x - rest) < .45);
    for (const p of [st.smoke, st.motes]) {
      const q = p.geometry.attributes.position;
      for (let k = 0; k < q.count; k++) assert.ok(q.getY(k) >= .04 && q.getY(k) < 1.6 && Math.abs(q.getX(k)) < 1 && Math.abs(q.getZ(k)) < 1.5, `${k}`);
    }
  }
  assert.ok(drains >= 2, `it drains (${drains})`);
  assert.ok(smoke > G.SMOKE_ALPHA * .7, `smoke ${smoke}`);
  assert.ok(mote > G.MOTE_ALPHA * .5, `motes ${mote}`);
  assert.ok(reachMin < G.REACH * .9, `reach ${reachMin}`);
  assert.ok(turnMax > .4 && turnMax <= G.BODY_YAW + 1e-9, `turn ${turnMax}`);
  assert.ok(headMax > .3 && headMax <= G.HEAD_YAW + 1e-9, `head ${headMax}`);
  assert.ok(eyeMax > 1.8 && eyeMax < 2.4, `eyes ${eyeMax}`);
  assert.ok(roll[0] < -.03 && roll[1] > .03, `roll ${roll}`);

  // a touch: the sleeves lunge and smoke is puffed forward (+z)
  a.actions = {current: {kind: 'attack', attack: 'touch', dir: [0, 1]}, age: 0, u: 0, queue: [], dead: false};
  let lunge = 0;
  for (let i = 0; i < 40; i++) {
    a.actions.u = Math.min(1, i / 40); a.actions.age = i * dt;
    t += dt; updateFidget(a, dt, t, true, hero);
    lunge = Math.min(lunge, a.arms[0].rotation.x - st.arms[0].x);
  }
  assert.ok(lunge < G.LUNGE * .85, `lunge ${lunge}`);
  assert.equal(st.puff.length, G.PUFF);
  assert.ok(st.puff.filter(p => p.age > 0).every(p => p.z > .25 && p.vz > 0));

  // death eases everything back to rest and the smoke thins out
  a.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 8; i++) { t += dt; updateFidget(a, dt, t, false, hero); }
  const r = st;
  assert.deepEqual(a.body.rotation.toArray().slice(0, 3), [r.body.x, r.body.y, r.body.z]);
  assert.deepEqual(a.head.rotation.toArray().slice(0, 3), [r.head.x, r.head.y, r.head.z]);
  a.arms.forEach((m, i) => { assert.equal(m.rotation.x, r.arms[i].x); assert.equal(m.rotation.z, r.arms[i].z); });
  assert.deepEqual(st.eyes.scale.toArray(), st.eyeScale.toArray());
  assert.ok(alphas(st.smoke).every(v => v === 0) && alphas(st.motes).every(v => v === 0));
});

test('two ghosts drift out of step, and the head rests without a hero', () => {
  const a = mon('ghost'), b = mon('shade');
  let diff = 0;
  for (let i = 0; i < 120; i++) {
    updateFidget(a, dt, i * dt, false); updateFidget(b, dt, i * dt, false);
    diff = Math.max(diff, Math.abs(a.body.rotation.z - b.body.rotation.z));
    assert.equal(a.head.rotation.y, a.ghostDrift.head.y);
  }
  assert.ok(diff > .01, `diff ${diff}`);
});
