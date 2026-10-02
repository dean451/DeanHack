import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateCharonOar, strokePoseAt, strokeLength, rows, PLANT, PUSH, ENTER, PUSH_T, FIRST_MIN, FIRST_SPAN} from './charon-oar.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateCharonOar(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation), a.weaponSocket.rotation, a.weaponSocket.position].flatMap(r => [r.x, r.y, r.z]);
const PLANS = [{strokes: 2}, {strokes: 3}];
const oar = a => a.weaponSocket.children.find(o => o.userData.part === 'oar');

// The oar's butt and blade tip in model space (charon.js buildOar: butt at y −.42, tip at .95, scaled .92).
function ends(a) {
  a.g.updateMatrixWorld(true);
  const w = a.weaponSocket.matrixWorld, toModel = a.g.matrixWorld.clone().invert();
  const at = y => new THREE.Vector3(0, y * .92, 0).applyMatrix4(w).applyMatrix4(toModel);
  return {butt: at(-.42), tip: at(.95)};
}

test('only Charon rows', () => {
  assert.ok(rows(make('charon')));
  for (const name of ['thoth amon', 'ranger', 'executioner', 'human']) assert.ok(!rows(make(name)), name);
  assert.equal(updateCharonOar(make('ranger'), 1 / 60, 0, false), null);
});

test('plant and push: the butt goes ahead then behind, above the floor, the blade clear of the hood', () => {
  const a = make('charon'), rest = snap(a);
  const apply = p => {
    a.body.rotation.x += p.bx; a.body.rotation.y += p.by; a.head.rotation.x += p.hp;
    a.arms[1].rotation.x += p.rx; a.weaponSocket.rotation.x += p.sx; a.weaponSocket.position.y += p.py; a.weaponSocket.position.z += p.pz;
  };
  const fresh = make('charon');
  const reset = () => {
    for (const k of ['head', 'body', 'weaponSocket']) { a[k].rotation.copy(fresh[k].rotation); a[k].position.copy(fresh[k].position); }
    a.arms.forEach((arm, i) => arm.rotation.copy(fresh.arms[i].rotation));
  };
  const butts = [];
  for (const plan of PLANS) for (let time = 0; time <= strokeLength(plan); time += 1 / 60) {
    reset(); apply(strokePoseAt(time, plan));
    const {butt, tip} = ends(a), box = new THREE.Box3().setFromObject(oar(a)).applyMatrix4(a.g.matrixWorld.clone().invert());
    assert.ok([butt, tip].every(v => v.toArray().every(Number.isFinite)));
    assert.ok(box.min.y > 0, `oar above the floor at ${time.toFixed(2)}: ${box.min.y}`);
    assert.ok(butt.y < .3, `butt near the floor: ${butt.y}`);
    // the blade passes the side of the hood, never through its back
    assert.ok(tip.x > .1 && tip.z > -.05, `blade clear of the hood at ${time.toFixed(2)}: ${tip.toArray()}`);
    butts.push(butt.z);
  }
  assert.ok(Math.max(...butts) > .3 && Math.min(...butts) < -.15, `butt sweeps ${Math.min(...butts)}..${Math.max(...butts)}`);
  // the stare holds: the head's world pitch barely moves with the lean
  reset(); apply(strokePoseAt(ENTER + PUSH_T * .5, PLANS[0])); a.g.updateMatrixWorld(true);
  const pitch = new THREE.Euler().setFromQuaternion(a.head.getWorldQuaternion(new THREE.Quaternion())).x;
  assert.ok(Math.abs(pitch - fresh.head.rotation.x) < .05, `stare ${pitch}`);
  reset(); assert.deepEqual(snap(a), rest);
});

test('poses are continuous and the hunch stays shallow', () => {
  for (const plan of PLANS) {
    let prev = strokePoseAt(0, plan);
    for (let time = 1 / 60; time <= strokeLength(plan) + .05; time += 1 / 60) {
      const p = strokePoseAt(time, plan);
      for (const k of Object.keys(p)) {
        assert.ok(Number.isFinite(p[k]));
        assert.ok(Math.abs(p[k] - prev[k]) < .05, `${k} jumps at ${time.toFixed(2)}: ${prev[k]} → ${p[k]}`);
      }
      assert.ok(p.bx < .16 && p.bx > -.01);
      prev = p;
    }
    assert.deepEqual(Object.values(prev).map(v => Math.abs(v)), Object.values(prev).map(() => 0));
  }
  assert.ok(PLANT.rx < 0 && PUSH.rx > 0);
});

test('a still Charon rows after a while, finishes and returns exactly to rest', () => {
  const a = make('charon'), rest = snap(a), dt = 1 / 60;
  let started = -1, ended = -1, strokes = 0, lastRx = 0;
  for (let i = 0; i < 40 * 60; i++) {
    const p = frame(a, dt);
    if (p && started < 0) started = i * dt;
    if (!p && started >= 0 && ended < 0) ended = i * dt;
    if (p && lastRx < 0 && p.rx >= 0) strokes++;
    lastRx = p ? p.rx : 0;
    if (ended >= 0) break;
  }
  assert.ok(started >= FIRST_MIN && started <= FIRST_MIN + FIRST_SPAN + .05, `first stroke at ${started}`);
  assert.ok(strokes === 2 || strokes === 3, `${strokes} strokes`);
  const want = started + strokeLength({strokes});
  assert.ok(Math.abs(ended - want) < .05, `ended ${ended} vs ${want}`);
  snap(a).forEach((v, i) => assert.ok(Math.abs(v - rest[i]) < 1e-9, `rest ${i}`));
});

test('walking or an attack fades it out fast and it never resumes', () => {
  const a = make('charon'), rest = snap(a), dt = 1 / 60;
  let p = null;
  for (let i = 0; i < 20 * 60 && !(p && p.rx < -.3); i++) p = frame(a, dt);
  assert.ok(p && p.rx < -.3, 'reached a plant');
  enqueueAction(a.actions, {kind: 'attack', attack: 'weapon', dir: [0, 1]});
  for (let i = 0; i < 6; i++) p = frame(a, dt);
  assert.ok(!p || Math.abs(p.rx) < .25, `fading: ${p?.rx}`);
  for (let i = 0; i < 120; i++) p = frame(a, dt);
  for (let i = 0; i < 30; i++) p = frame(a, dt);
  assert.equal(p, null);
  while (a.actions.current || a.actions.queue.length) frame(a, dt);
  frame(a, dt);
  snap(a).forEach((v, i) => assert.ok(Math.abs(v - rest[i]) < 1e-9, `rest ${i}: ${v} vs ${rest[i]}`));
  // walking holds it off
  for (let i = 0; i < 30 * 60; i++) assert.equal(frame(a, dt, true), null);
});
