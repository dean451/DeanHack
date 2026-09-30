import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateMonkBow, bowPose, bows, ARM, ROLL, NOD, LEAN, BOW_LEN, FIRST_MIN, FIRST_SPAN} from './monk-bow.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 3});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateMonkBow(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.body.rotation.x, ...a.arms.flatMap(r => [r.rotation.x, r.rotation.z])];
// both fists, in the model's own space
function fists(a) {
  a.g.updateMatrixWorld(true);
  const inv = a.g.matrixWorld.clone().invert();
  return a.arms.map(arm => new THREE.Vector3(0, -.37, .012).applyMatrix4(arm.matrixWorld).applyMatrix4(inv));
}
function lowest(a) {
  a.g.updateMatrixWorld(true);
  const v = new THREE.Vector3(), inv = a.g.matrixWorld.clone().invert();
  let y = Infinity;
  a.g.traverse(o => {
    const p = o.geometry?.attributes?.position; if (!p) return;
    for (let i = 0; i < p.count; i += 7) y = Math.min(y, v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv).y);
  });
  return y;
}

test('the bow pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = bowPose(0);
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = bowPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.right <= 1e-12 && p.right >= ARM - 1e-12 && p.roll <= 1e-12 && p.roll >= ROLL - 1e-12);
    assert(p.nod >= 0 && p.nod <= NOD + 1e-12 && p.lean >= 0 && p.lean <= LEAN + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${u}`);
    prev = p;
  }
  for (const p of [bowPose(0), bowPose(1), bowPose(.5, 0), bowPose(NaN)]) assert(Object.values(p).every(v => v === 0));
  assert(bowPose(.2).nod === 0, 'the hands come up before the bow');
  assert(Math.abs(bowPose(.5).nod - NOD) < 1e-9 && Math.abs(bowPose(.5).right - ARM) < 1e-9, 'bows with the hands joined');
  assert(bowPose(.72).nod === 0 && bowPose(.72).right < ARM * .99, 'straightens before the hands drop');
});

test('only monks bow', () => {
  assert(bows(make('monk')));
  for (const name of ['knight', 'samurai', 'wizard', 'valkyrie', 'watchman']) assert(!bows(make(name)), name);
});

test('a standing monk salutes now and then, fist to hand before its chest, and goes back exactly to rest', () => {
  const a = make('monk'), rest = snap(a), dt = 1 / 60, restHead = new THREE.Vector3();
  a.g.updateMatrixWorld(true); a.head.getWorldPosition(restHead);
  let started = null, t = 0, joined = null, bowed = null, floor = Infinity;
  for (let i = 0; i < 60 * 30 && !started; i++) { if (frame(a, dt)) started = t; t += dt; }
  assert(started != null && started >= FIRST_MIN - .1 && started <= FIRST_MIN + FIRST_SPAN + .1, `started at ${started}`);
  for (let i = 0; i < BOW_LEN * 60 + 5; i++) {
    const p = frame(a, dt), u = a.monkBow.cur?.u;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (i % 10 === 0) floor = Math.min(floor, lowest(a));
    if (p && u > .24 && u < .26) joined = fists(a);
    if (p && u > .5 && u < .52) { bowed = new THREE.Vector3(); a.head.getWorldPosition(bowed); }
  }
  assert(joined, 'reached the salute');
  const [l, r] = joined;
  assert(l.distanceTo(r) < .09, `fists ${l.distanceTo(r)} apart`);
  assert(Math.abs(r.x) < .06 && Math.abs(l.x) < .06, 'before the breastbone');
  assert(r.z > .25 && r.y > .6 && r.y < .85 && l.y < r.y, `right fist at ${r.toArray()}, left at ${l.toArray()}`);
  assert(bowed && bowed.z > restHead.z + .08 && bowed.y < restHead.y, 'leans forward into the bow');
  assert(floor > -.02, `sinks into the floor (${floor})`);
  assert.equal(a.monkBow.cur, null);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-12, `part ${i} back at rest`));
});

test('walking, an attack or death fades the bow out within ~0.1 s and leaves it at rest', () => {
  for (const cut of ['walk', 'attack', 'die']) {
    const a = make('monk'), rest = snap(a), dt = 1 / 60;
    for (let i = 0; i < 60 * 30 && !(a.monkBow?.cur?.u > .4); i++) frame(a, dt);
    assert(a.monkBow.cur?.u > .4, cut);
    if (cut === 'attack') enqueueAction(a.actions, {kind: 'attack', type: 'weapon', dir: [1, 0]});
    if (cut === 'die') enqueueAction(a.actions, {kind: 'die'});
    for (let i = 0; i < 8; i++) frame(a, dt, cut === 'walk');
    assert(a.monkBow.f < .2, `${cut}: faded to ${a.monkBow.f}`);
    for (let i = 0; i < 60 * 3; i++) frame(a, dt, cut === 'walk');
    assert.equal(a.monkBow.cur, null, cut);
    if (cut !== 'die') snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `${cut}: part ${i} back at rest`));
    else assert.equal(updateMonkBow(a, dt, 0, false), null, 'the dead do not bow');
  }
});
