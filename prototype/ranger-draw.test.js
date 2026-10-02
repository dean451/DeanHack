import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateRangerDraw, drawPoseAt, draws, drawLength, NOCK, DRAW, SWEEP, CHIN, REACH, DRAW_T, FIRST_MIN, FIRST_SPAN} from './ranger-draw.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateRangerDraw(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation), a.weaponSocket.rotation, a.weaponSocket.position].flatMap(r => [r.x, r.y, r.z]);
const PLANS = [{side: 1, hold: 1.4}, {side: -1, hold: 2.4}];

// The bow's frame inside the left arm (ranger.js buildArm(true)) and the arrow's axis in the socket.
const BOW = new THREE.Matrix4().compose(new THREE.Vector3(0, -.37, .03), new THREE.Quaternion().setFromEuler(new THREE.Euler(.55, 0, -.12)), new THREE.Vector3(1, 1, 1));
const SHAFT = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(Math.PI / 2 - .35, 0, 0));
function setPose(a, p) {
  const fresh = make('ranger');
  for (const k of ['head', 'body', 'weaponSocket']) { a[k].rotation.copy(fresh[k].rotation); a[k].position.copy(fresh[k].position); }
  a.arms.forEach((arm, i) => arm.rotation.copy(fresh.arms[i].rotation));
  a.head.rotation.x += p.pitch; a.head.rotation.y += p.yaw; a.body.rotation.y += p.body;
  const [l, r] = a.arms, w = a.weaponSocket;
  l.rotation.x += p.lx; l.rotation.y += p.ly; l.rotation.z += p.lz; r.rotation.x += p.rx; r.rotation.z += p.rz;
  w.rotation.x += p.sx; w.rotation.y += p.sy; w.rotation.z += p.sz;
  w.position.x += p.px; w.position.y += p.py; w.position.z += p.pz;
  a.g.updateMatrixWorld(true);
  const bow = a.arms[0].matrixWorld.clone().multiply(BOW), toModel = a.g.matrixWorld.clone().invert();
  const inModel = v => v.applyMatrix4(toModel);
  return {
    dir: new THREE.Vector3(0, 0, 1).transformDirection(bow),
    string: inModel(new THREE.Vector3(0, 0, -.068).applyMatrix4(bow)),
    hand: inModel(new THREE.Vector3(0, -.37, 0).applyMatrix4(a.arms[1].matrixWorld)),
    nock: inModel(SHAFT.clone().multiplyScalar(-.25).applyMatrix4(w.matrixWorld)),
    shaft: SHAFT.clone().transformDirection(w.matrixWorld),
    handInBody: a.body.worldToLocal(new THREE.Vector3(0, -.37, 0).applyMatrix4(a.arms[1].matrixWorld)),
  };
}

test('only the ranger draws', () => {
  assert(draws(make('ranger')));
  for (const name of ['convict', 'rogue', 'archeologist', 'jackal']) assert(!draws(make(name)), name);
  const r = make('ranger'); r.asset = {}; assert(!draws(r));
});

test('the draw stays in bounds, starts and ends at rest, and moves slowly', () => {
  for (const plan of PLANS) {
    const T = drawLength(plan), steps = Math.round(T * 600);
    let prev = drawPoseAt(0, plan), maxStep = 0;
    for (let i = 0; i <= steps; i++) {
      const time = T * i / steps, p = drawPoseAt(time, plan);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(p.body >= -SWEEP - 1e-9 && p.body <= DRAW.body + SWEEP + 1e-9);
      assert(p.pitch >= -1e-12 && p.pitch <= CHIN + 1e-12 && Math.abs(p.yaw) <= DRAW.body + 1e-9);
      let step = 0;
      for (const k of Object.keys(p)) step = Math.max(step, Math.abs(p[k] - prev[k]) * 10);
      maxStep = Math.max(maxStep, step);
      prev = p;
    }
    assert(maxStep < .1, `largest step per frame ${maxStep}`);
    for (const p of [drawPoseAt(0, plan), drawPoseAt(T, plan), drawPoseAt(1, plan, 0), drawPoseAt(NaN, plan)]) assert(Object.values(p).every(v => v === 0));
  }
});

test('nocked and drawn, the fist holds the nock on the string behind the bow, clear of the jerkin', () => {
  const a = make('ranger'), plan = PLANS[0];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const time = REACH + DRAW_T * i / steps, s = setPose(a, drawPoseAt(time, plan)), k = i / steps;
    // the draw: the fist is on the string at the nock, then pulled back along the arrow (to .12)
    const want = s.string.clone().addScaledVector(s.dir, -.12 * (k * k * (3 - 2 * k)));
    assert(s.hand.distanceTo(want) < .03, `fist off the string by ${s.hand.distanceTo(want)} at ${k}`);
    assert(s.nock.distanceTo(s.hand) < .03, `nock off the fist by ${s.nock.distanceTo(s.hand)}`);
    // the arrow lies along the bow's line of fire: forward and a little down
    assert(s.shaft.dot(s.dir) > .97, `arrow off the bow's line by ${Math.acos(s.shaft.dot(s.dir))}`);
    assert(s.dir.z > .95 && s.dir.y < 0 && s.dir.y > -.2);
    assert(s.handInBody.z > .18, `fist in the jerkin (${s.handInBody.z})`);
  }
  // the head looks along the arrow, not off with the turned body
  a.g.updateMatrixWorld(true);
  const look = new THREE.Vector3(0, 0, 1).transformDirection(a.head.matrixWorld);
  assert(look.z > .98, `head looks ${look.toArray()}`);
});

test('a still ranger draws after a few seconds, then returns exactly to rest', () => {
  const a = make('ranger'), rest = snap(a);
  let first = -1, seen = false, t = 0;
  for (; t < 40 && !(seen && !a.rangerDraw.cur); t += 1 / 60) {
    const p = frame(a, 1 / 60);
    if (p && first < 0) first = t;
    if (p) seen = true;
    for (const v of snap(a)) assert(Number.isFinite(v));
  }
  assert(seen);
  assert(first >= FIRST_MIN - 1e-6 && first <= FIRST_MIN + FIRST_SPAN + .05, `first draw at ${first}`);
  frame(a, 1 / 60);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `${i}: ${v} vs ${rest[i]}`));
});

test('walking or an action breaks the draw off quickly and it never resumes', () => {
  const a = make('ranger'), rest = snap(a);
  let t = 0;
  while (!a.rangerDraw?.cur || a.rangerDraw.cur.time < REACH + DRAW_T) { frame(a, 1 / 60); if ((t += 1 / 60) > 30) assert.fail('never drew'); }
  for (let i = 0; i < 6; i++) frame(a, 1 / 60, true);
  assert(a.rangerDraw.f < .3);
  for (let i = 0; i < 60; i++) frame(a, 1 / 60, true);
  assert.equal(a.rangerDraw.cur, null);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9));
  // an attack swing: the arm is posed by actions.js and the draw stays out of it
  const b = make('ranger');
  for (let i = 0; i < 60 * 3; i++) frame(b, 1 / 60);
  enqueueAction(b.actions, {kind: 'attack', type: 'weapon', dir: [0, 1]});
  let acted = false;
  for (let i = 0; i < 30; i++) { const p = frame(b, 1 / 60); if (p) assert(Object.values(p).every(v => Number.isFinite(v))); acted ||= !!b.actions.current; }
  assert(acted);
  assert(!b.rangerDraw.cur || b.rangerDraw.cur.broken);
});
