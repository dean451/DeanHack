import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as K from './troll-knit.js';

const dt = 1 / 60;
function mon(name, symbol = 'T') { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 1}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const parts = a => [a.body, a.head, ...a.arms];
const pose = a => parts(a).flatMap(o => o.rotation.toArray().slice(0, 3));

test('trolls knit; the generic T is a troll; ogres and orcs are not', () => {
  for (const name of ['troll', 'ice troll', 'rock troll', 'water troll', 'olog-hai']) {
    const a = mon(name);
    assert.equal(a.troll, name);
    assert.equal(a.arms.length, 2);
    assert.ok(a.head?.isGroup);
    assert.ok(K.updateTrollKnit(a, dt, 0, false), name);
  }
  assert.equal(mon('cave troll').troll, 'troll');
  for (const [name, s] of [['ogre', 'O'], ['hill orc', 'o'], ['vampire', 'V']]) assert.equal(K.updateTrollKnit(mon(name, s), dt, 0, false), null, name);
});

test('poses stay in bounds and end at zero; wound spots sit on the hide', () => {
  for (let u = -.1; u <= 1.1; u += .005) {
    const p = K.knitPose(u), r = K.strikePose(u);
    for (const v of [...Object.values(p), r.haul, r.slam]) assert.ok(v >= 0 && v <= 1, `${u}`);
  }
  for (const v of Object.values(K.knitPose(1))) assert.equal(v, 0);
  assert.deepEqual(K.strikePose(1), {haul: 0, slam: 0});
  assert.ok(K.knitPose(.3).clutch > .99 && K.knitPose(.78).flex > .99 && K.knitPose(.68).heal > .99);
  const a = mon('troll');
  a.g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(a.body);
  for (const s of K.SPOTS) assert.ok(box.containsPoint(s.p), `${s.p.toArray()}`);
});

test('a troll breathes, watches, knits a wound after a blow, slams and rests after death', () => {
  const a = mon('troll');
  a.g.position.set(0, 0, 0);
  const hero = new THREE.Vector3(-2, 0, 2);
  const rest = pose(a);
  updateFidget(a, 0, 0, false, hero);
  const st = a.trollKnit;
  let t = 0, knits = 0, was = false, glow = 0, headMax = 0, clutch = 0, roar = 0, sniffs = 0, sniffing = false;
  for (let i = 0; i < 60 * 30; i++) {
    t += dt; updateFidget(a, dt, t, false, hero);
    if (st.knit && !was) knits++;
    was = !!st.knit;
    if (st.sniff != null && !sniffing) sniffs++;
    sniffing = st.sniff != null;
    glow = Math.max(glow, ...alphas(st.cloud));
    assert.ok(finite(st.cloud) && pose(a).every(Number.isFinite));
    if (!st.knit) headMax = Math.max(headMax, Math.abs(a.head.rotation.y - st.head.y));
    clutch = Math.min(clutch, ...a.arms.map((arm, k) => arm.rotation.x - st.arms[k].x));
    roar = Math.min(roar, a.head.rotation.x - st.head.x);
    assert.ok(Math.abs(a.body.rotation.x - st.body.x) < .3);
    const q = st.cloud.geometry.attributes.position;
    for (let k = 0; k < q.count; k++) assert.ok(q.getY(k) > .4 && q.getY(k) < 1.1 && Math.abs(q.getX(k)) < .4 && Math.abs(q.getZ(k)) < .4, `${k}`);
  }
  assert.ok(knits >= 2, `it worries at old wounds (${knits})`);
  assert.ok(sniffs >= 3, `it sniffs (${sniffs})`);
  assert.ok(glow > .6, `the wound glows (${glow})`);
  assert.ok(headMax > .5 && headMax <= K.HEAD_YAW + .05, `watches the hero (${headMax})`);
  assert.ok(clutch < -.9, `clutches the wound (${clutch})`);
  assert.ok(roar < -.25, `throws its head back (${roar})`);

  // a blow starts a knit a moment later, even while busy
  st.knit = null; st.wait = 99;
  a.actions = {current: {kind: 'hit'}, age: 0, u: .2, queue: []};
  updateFidget(a, dt, t += dt, true, hero);
  assert.equal(st.knit, null);
  for (let i = 0; i < 30; i++) updateFidget(a, dt, t += dt, true, hero);
  assert.ok(st.knit && st.knit.u > 0, 'knits after the blow');
  for (let i = 0; i < 60; i++) updateFidget(a, dt, t += dt, true, hero);
  assert.ok(Math.max(...alphas(st.cloud)) > .4, 'gash shows');

  // the attack hauls the right arm overhead, then slams
  a.actions = {current: {kind: 'attack'}, age: 0, u: .3, queue: []};
  for (let i = 0; i < 6; i++) updateFidget(a, dt, t += dt, true, hero);
  assert.equal(st.knit, null);
  assert.ok(a.arms[1].rotation.x - st.arms[1].x < -1.8, `haul (${a.arms[1].rotation.x - st.arms[1].x})`);
  a.actions.u = .5;
  updateFidget(a, dt, t += dt, true, hero);
  assert.ok(a.body.rotation.x - st.body.x > .12, 'lunge');

  // death: everything back to rest, motes gone
  a.actions = {dead: true, queue: []};
  for (let i = 0; i < 60 * 8; i++) updateFidget(a, dt, t += dt, true, hero);
  pose(a).forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1e-9, `part ${k}: ${v} vs ${rest[k]}`));
  assert.equal(Math.max(...alphas(st.cloud)), 0);
});

test('two trolls are out of step', () => {
  const a = mon('troll'), b = mon('troll');
  for (let i = 0, t = 0; i < 120; i++) { t += dt; updateFidget(a, dt, t, false); updateFidget(b, dt, t, false); }
  assert.notDeepEqual(pose(a), pose(b));
});
