import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateConvictHunted, huntedPoseAt, glances, glanceLength, LOOK, TWIST, CHIN, SHAKE, GUARD, TURN, FIRST_MIN, FIRST_SPAN, GAP_MIN, GAP_SPAN} from './convict-hunted.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateConvictHunted(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const parts = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation), a.weaponSocket.rotation];
const snap = a => parts(a).flatMap(r => [r.x, r.y, r.z]);
const PLANS = [{side: 1, second: false, hold1: .55, hold2: .9}, {side: -1, second: true, hold1: .95, hold2: .55}, {side: 1, second: true, hold1: .7, hold2: .7}];
// the shiv's point: the vertex furthest along +z in the socket's own space
function shivTip(a) {
  const shiv = a.weaponSocket.children.find(c => c.isMesh), pos = shiv.geometry.attributes.position, v = new THREE.Vector3();
  let best = null;
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(shiv.matrix); if (!best || v.z > best.z) best = v.clone(); }
  return best;
}
function inModel(a, part, p) {
  a.g.updateMatrixWorld(true);
  return p.clone().applyMatrix4(part.matrixWorld).applyMatrix4(a.g.matrixWorld.clone().invert());
}

test('the glance stays in bounds, starts and ends at rest, and only the snaps are quick', () => {
  for (const plan of PLANS) {
    const T = glanceLength(plan), steps = Math.round(T * 600);
    let prev = huntedPoseAt(0, plan), maxStep = 0, maxSettle = 0;
    for (let i = 0; i <= steps; i++) {
      const time = T * i / steps, p = huntedPoseAt(time, plan);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(Math.abs(p.yaw) <= LOOK + SHAKE + 1e-12 && Math.abs(p.twist) <= TWIST * LOOK + 1e-12);
      assert(p.pitch <= 1e-12 && p.pitch >= CHIN - 1e-12);
      assert(p.rx <= 1e-12 && p.rx >= GUARD.rx - 1e-12 && p.sx >= -1e-12 && p.sx <= GUARD.sx + 1e-12 && Math.abs(p.sz) <= TURN + 1e-12);
      let step = 0;
      for (const k of Object.keys(p)) step = Math.max(step, Math.abs(p[k] - prev[k]) * 10);
      maxStep = Math.max(maxStep, step);
      if (time > T - 1.0) maxSettle = Math.max(maxSettle, step);
      prev = p;
    }
    // at 60 fps (10 samples a frame): the switch to the other shoulder moves up to ~.48 rad a frame, the settle stays slow
    assert(maxStep < .5, `largest step per frame ${maxStep}`);
    assert(maxStep > .15, 'the snap is a jerk, not a drift');
    assert(maxSettle < .06, `settle step ${maxSettle}`);
    for (const p of [huntedPoseAt(0, plan), huntedPoseAt(T, plan), huntedPoseAt(1, plan, 0), huntedPoseAt(NaN, plan)]) assert(Object.values(p).every(v => v === 0));
  }
  // it looks to the first side, then (with a second look) to the other
  const p = PLANS[1];
  assert(huntedPoseAt(.16 + .5, p).yaw < -LOOK * .9);
  assert(huntedPoseAt(.16 + .95 + .2 + .3, p).yaw > LOOK * .7);
});

test('only convicts glance over their shoulder', () => {
  assert(glances(make('convict')));
  for (const name of ['prisoner', 'mugger', 'tourist', 'watchman', 'human']) assert(!glances(make(name)), name);
});

test('the guard brings the shiv up in front of the ribs, point out, clear of the body', () => {
  const a = make('convict'), tip = shivTip(a), rest = inModel(a, a.weaponSocket, tip);
  const g = make('convict'), p = huntedPoseAt(.16 + .5, PLANS[0]);
  const [l, r] = g.arms;
  g.head.rotation.x += p.pitch; g.head.rotation.y += p.yaw; g.body.rotation.y += p.twist;
  l.rotation.x += p.lx; l.rotation.z += p.lz; r.rotation.x += p.rx; r.rotation.z += p.rz;
  g.weaponSocket.rotation.x += p.sx; g.weaponSocket.rotation.z += p.sz;
  const up = inModel(g, g.weaponSocket, tip), hand = inModel(g, g.weaponSocket, new THREE.Vector3());
  assert(up.y > rest.y + .12, `tip up (${rest.y.toFixed(2)} → ${up.y.toFixed(2)})`);
  assert(up.z > .3 && hand.z > .12, `out in front (tip z ${up.z.toFixed(2)}, hand z ${hand.z.toFixed(2)})`);
  assert(up.z > hand.z + .1, 'point out, away from the body');
});

test('glances come when still, fade out when interrupted, and leave the rest pose unchanged', () => {
  const a = make('convict'), rest = snap(a);
  let first = null, t = 0;
  for (let i = 0; i < 60 * (FIRST_MIN + FIRST_SPAN + .5); i++) { t += 1 / 60; if (frame(a, 1 / 60) && first == null) first = t; }
  assert(first != null && first >= FIRST_MIN - 1e-9 && first <= FIRST_MIN + FIRST_SPAN + .05, `first glance at ${first}`);
  // walk mid-glance: it fades out within ~0.1 s and does not pick back up
  for (let i = 0; i < 60 * (GAP_MIN + GAP_SPAN + 1) && !a.convictHunted.cur; i++) frame(a, 1 / 60);
  for (let i = 0; i < 10; i++) frame(a, 1 / 60);
  assert(a.convictHunted.cur);
  for (let i = 0; i < 6; i++) frame(a, 1 / 60, true);
  assert(a.convictHunted.f < .25);
  for (let i = 0; i < 30; i++) frame(a, 1 / 60, true);
  assert(!a.convictHunted.cur);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back to rest`));
  // a long still run: finite throughout, back to rest after each glance
  let n = 0;
  for (let i = 0; i < 60 * 60; i++) {
    const p = frame(a, 1 / 60);
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (p) n++;
    else snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  }
  assert(n > 60 * 6, `glanced for ${(n / 60).toFixed(1)} s of a minute`);
  // an attack interrupts it, and death stops it for good
  for (let i = 0; i < 1200 && !a.convictHunted.cur; i++) frame(a, 1 / 60);
  for (let i = 0; i < 10; i++) frame(a, 1 / 60);
  assert(a.convictHunted.cur);
  enqueueAction(a.actions, {kind: 'attack', type: 'weapon', dir: [1, 0]});
  for (let i = 0; i < 12; i++) frame(a, 1 / 60);
  assert(a.convictHunted.cur?.broken || !a.convictHunted.cur, 'the attack breaks it off');
  for (let i = 0; i < 120; i++) frame(a, 1 / 60);
  enqueueAction(a.actions, {kind: 'die'});
  for (let i = 0; i < 60; i++) frame(a, 1 / 60);
  assert(a.actions.dead);
  for (let i = 0; i < 600; i++) assert.equal(frame(a, 1 / 60), null);
});
