import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateBarbarianBrood, broodPose, broods, HOIST, TIP, TURN, GLARE, SETTLE, ROLL, ROLL_GLARE, LEN, FIRST_MIN, FIRST_SPAN} from './barbarian-brood.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateBarbarianBrood(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const parts = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation), a.weaponSocket.rotation];
const snap = a => parts(a).flatMap(r => [r.x, r.y, r.z]);
// a point on the haft, s up its own axis (the axe is built tilted .35 forward in the fist)
function haft(a, s) {
  a.g.updateMatrixWorld(true);
  const inv = a.g.matrixWorld.clone().invert();
  return new THREE.Vector3(0, s * Math.cos(.35), s * Math.sin(.35)).applyMatrix4(a.weaponSocket.children[0].matrixWorld).applyMatrix4(inv);
}

test('both brood poses stay in bounds, move smoothly and start and end at rest', () => {
  const n = 6000;
  for (const kind of ['shoulder', 'roll']) {
    let prev = broodPose(kind, 0), left = 0, right = 0, held = 0;
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = broodPose(kind, u);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(p.arm <= 1e-12 && p.arm >= HOIST - SETTLE - 1e-12 && p.tip <= 1e-12 && p.tip >= TIP - 1e-12);
      assert(p.turn >= 0 && p.turn <= TURN + 1e-12 && Math.abs(p.roll) <= ROLL + 1e-12);
      assert(p.pitch <= Math.max(GLARE, ROLL * .8 + ROLL_GLARE) + 1e-12 && p.pitch >= -ROLL * .8 - 1e-12);
      for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .01, `${kind} ${k} jumps at ${u}`);
      left = Math.min(left, p.roll); right = Math.max(right, p.roll);
      if (Math.abs(p.arm - HOIST) < .01) held++;
      prev = p;
    }
    for (const p of [broodPose(kind, 0), broodPose(kind, 1), broodPose(kind, .5, 0), broodPose(kind, NaN)]) assert(Object.values(p).every(v => v === 0));
    if (kind === 'roll') assert(left < -ROLL * .9 && right > ROLL * .9, 'the head rolls to both sides');
    else assert(held > n * .3, 'the axe rests on the shoulder a while');
  }
});

test('only barbarians brood', () => {
  assert(broods(make('barbarian')));
  for (const name of ['rogue', 'monk', 'knight', 'samurai', 'healer', 'archeologist', 'watchman']) assert(!broods(make(name)), name);
});

test('the shouldered axe lies over the right shoulder with the blade behind, clear of the head', () => {
  const a = make('barbarian'), p = broodPose('shoulder', .5);
  a.arm.rotation.x += p.arm; a.weaponSocket.rotation.x += p.tip; a.body.rotation.y += p.turn; a.head.rotation.x += p.pitch;
  const butt = haft(a, 0), head = haft(a, .6);
  assert(butt.z > .2 && head.z < -.1, `haft runs from in front (${butt.z}) to behind (${head.z})`);
  // where the haft crosses the shoulder plane it sits just above the shoulder pivot (.82)
  const k = butt.z / (butt.z - head.z), y = butt.y + k * (head.y - butt.y), x = butt.x + k * (head.x - butt.x);
  assert(y > .85 && y < 1, `crosses at height ${y}`);
  assert(x > .15 && x < .3, `crosses over the right shoulder (${x})`);
});

test('a standing barbarian shoulders its axe, then rolls its neck, and goes back exactly to rest', () => {
  const a = make('barbarian'), rest = snap(a), dt = 1 / 60;
  let t = 0, started = null;
  for (let i = 0; i < 60 * 30 && !started; i++) { if (frame(a, dt)) started = t; t += dt; }
  assert(started != null && started >= FIRST_MIN - .1 && started <= FIRST_MIN + FIRST_SPAN + .1, `started at ${started}`);
  const seen = [];
  for (let i = 0; i < 60 * 40; i++) {
    frame(a, dt);
    const kind = a.barbarianBrood.cur?.kind;
    if (kind && seen.at(-1) !== kind) seen.push(kind);
    for (const v of snap(a)) assert(Number.isFinite(v));
  }
  assert.deepEqual(seen.slice(0, 2), ['shoulder', 'roll']);
  while (a.barbarianBrood.cur) frame(a, dt);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back at rest`));
  assert(LEN.shoulder > 3 && LEN.roll > 3, 'slow enough to glide');
});

test('walking, an attack or death fades the brood out within ~0.1 s and leaves it at rest', () => {
  for (const [kind, at] of [['shoulder', .2], ['shoulder', .5], ['roll', .4]]) for (const cut of ['walk', 'attack', 'die']) {
    const a = make('barbarian'), rest = snap(a), dt = 1 / 60, name = `${kind}@${at} ${cut}`;
    for (let i = 0; i < 60 * 60 && !(a.barbarianBrood?.cur?.kind === kind && a.barbarianBrood.cur.u > at); i++) frame(a, dt);
    assert(a.barbarianBrood.cur?.u > at, name);
    if (cut === 'attack') enqueueAction(a.actions, {kind: 'attack', type: 'weapon', dir: [1, 0]});
    if (cut === 'die') enqueueAction(a.actions, {kind: 'die'});
    for (let i = 0; i < 8; i++) frame(a, dt, cut === 'walk');
    assert(a.barbarianBrood.f < .2, `${name}: faded to ${a.barbarianBrood.f}`);
    for (let i = 0; i < 60 * 3; i++) frame(a, dt, cut === 'walk');
    assert.equal(a.barbarianBrood.cur, null, name);
    if (cut !== 'die') snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `${name}: part ${i} back at rest`));
    else assert.equal(updateBarbarianBrood(a, dt, 0, false), null, 'the dead do not brood');
  }
});
