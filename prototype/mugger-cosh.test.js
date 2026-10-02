import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateMuggerCosh, slapPoseAt, slaps, turnLength, HOLD, LIFT_ARM, LIFT_WRIST, OVER, GIVE, NOD, COCK, LOOK_UP, GRIND_ROLL, TIP, RAISE, SLAP, FIRST_MIN, FIRST_SPAN, SLAPS_MIN, SLAPS_MAX} from './mugger-cosh.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateMuggerCosh(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const parts = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation), a.weaponSocket.rotation];
const snap = a => parts(a).flatMap(r => [r.x, r.y, r.z]);
// a point in a part's own space, in the model's space
function inModel(a, part, p = new THREE.Vector3()) {
  a.g.updateMatrixWorld(true);
  return p.clone().applyMatrix4(part.matrixWorld).applyMatrix4(a.g.matrixWorld.clone().invert());
}
function posed(p) {
  const b = make('mugger'), [l, r] = b.arms;
  b.head.rotation.x += p.pitch; b.head.rotation.z += p.roll;
  l.rotation.x += p.lx; l.rotation.z += p.lz; r.rotation.x += p.rx; r.rotation.z += p.rz;
  b.weaponSocket.rotation.x += p.sx; b.weaponSocket.rotation.y += p.sy; b.weaponSocket.rotation.z += p.sz;
  return b;
}
// the cosh's lead head (mugger.js builds it along +y, then leans it back .35), and the front of the left fist
const COSH_HEAD = new THREE.Vector3(0, .34, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -.35);
const FIST = new THREE.Vector3(0, -.3, 0), ON_FIST = new THREE.Vector3(0, .04, 0);

test('the slap pose stays in bounds, starts and ends at rest, and only the smack is quick', () => {
  for (let n = SLAPS_MIN; n <= SLAPS_MAX; n++) {
    const T = turnLength(n), steps = Math.round(T * 600);
    let prev = slapPoseAt(0, n), hits = 0, wasHit = false, maxStep = 0;
    for (let i = 0; i <= steps; i++) {
      const time = T * i / steps, p = slapPoseAt(time, n);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(p.lz >= -1e-12 && p.lz <= HOLD.lz + 1e-12 && p.sz >= TIP.sz - 1e-12 && p.sz <= HOLD.sz + 1e-12);
      assert(p.rx >= HOLD.rx + LIFT_ARM - 1e-12 && p.rx <= -LIFT_ARM * OVER + 1e-12);
      assert(p.sy <= HOLD.sy + TIP.sy + LIFT_WRIST + 1e-12 && p.sy >= -LIFT_WRIST * OVER - 1e-12);
      assert(p.lx >= HOLD.lx - 1e-12 && p.lx <= GIVE + 1e-12 && p.sx >= HOLD.sx - GRIND_ROLL - 1e-12 && p.sx <= TIP.sx + 1e-12);
      assert(p.pitch <= NOD + 1e-12 && p.pitch >= -LOOK_UP - 1e-12 && p.roll >= 0 && p.roll <= COCK + 1e-12);
      // at 60 fps (10 samples a frame) nothing jumps more than the smack's .25 rad
      for (const k of Object.keys(p)) maxStep = Math.max(maxStep, Math.abs(p[k] - prev[k]) * 10);
      const hit = p.roll > COCK * .99 && p.pitch > NOD * .5 - LOOK_UP;
      if (hit && !wasHit) hits++;
      wasHit = hit; prev = p;
    }
    assert(maxStep < .25, `n=${n}: largest step per frame ${maxStep}`);
    assert.equal(hits, n, `n=${n} smacks`);
    for (const p of [slapPoseAt(0, n), slapPoseAt(T, n), slapPoseAt(1, n, 0), slapPoseAt(NaN, n)]) assert(Object.values(p).every(v => v === 0));
  }
});

test('only muggers slap a cosh', () => {
  assert(slaps(make('mugger')));
  for (const name of ['tourist', 'black marketeer', 'miner', 'watchman', 'shopkeeper', 'human']) assert(!slaps(make(name)), name);
});

test('the cosh head lands on the left fist, lifts well above it, and never hits the face or goes through the chest', () => {
  const n = 3, a = make('mugger');
  const contact = RAISE + SLAP * .8, lifted = RAISE + SLAP * .7;
  for (const [time, lo, hi] of [[contact, 0, .06], [RAISE + 2 * SLAP + SLAP * .8, 0, .06], [RAISE + n * SLAP + .7, 0, .04], [lifted, .2, .32]]) {
    const b = posed(slapPoseAt(time, n)), c = inModel(b, b.weaponSocket, COSH_HEAD), f = inModel(b, b.arms[0], FIST).add(ON_FIST);
    const d = c.distanceTo(f);
    assert(d >= lo && d <= hi, `at ${time.toFixed(2)} s the cosh head is ${d.toFixed(3)} from the fist`);
    assert(c.z > .15, 'out in front of the belly');
    if (hi > .1) assert(c.y > f.y + .18, 'lifted above it');
  }
  // the fist comes up in front of the belly, and the head stays clear of the whole swing
  const rest = inModel(a, a.arms[0], FIST), held = posed(slapPoseAt(contact, n)), f = inModel(held, held.arms[0], FIST);
  assert(f.y > rest.y + .12 && f.z > rest.z + .15 && f.x > rest.x + .08, `fist up, forward and in (${f.toArray().map(v => v.toFixed(2))})`);
  // along the whole swing: the lead head stays clear of the sack (its centre at least .075 from every
  // vertex: the head's radius is .04, its nails .024), and three points along the cosh stay outside an
  // ellipse round the chest (half-widths .3 and .22) at chest height
  const T = turnLength(n), sack = a.head.children.find(m => m.userData.part === 'head').geometry.attributes.position;
  const along = [.12, .22, .34].map(y => new THREE.Vector3(0, y, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -.35));
  const v = new THREE.Vector3();
  for (let i = 1; i < 200; i++) {
    const time = T * i / 200, b = posed(slapPoseAt(time, n)), c = inModel(b, b.weaponSocket, COSH_HEAD);
    let near = Infinity;
    for (let j = 0; j < sack.count; j += 3) near = Math.min(near, inModel(b, b.head, v.fromBufferAttribute(sack, j)).distanceTo(c));
    assert(near > .075, `cosh head ${near.toFixed(3)} from the sack at ${time.toFixed(2)} s`);
    for (const q of along) {
      const w = inModel(b, b.weaponSocket, q);
      if (w.y > .3 && w.y < 1.05) assert(Math.hypot(w.x / .3, w.z / .22) > .97, `cosh through the chest at ${time.toFixed(2)} s (${w.toArray().map(x => x.toFixed(2))})`);
    }
  }
});

test('a standing mugger slaps its cosh, again later, and goes back exactly to rest', () => {
  const a = make('mugger'), rest = snap(a), dt = 1 / 60;
  let t = 0, started = null;
  for (let i = 0; i < 60 * 30 && !started; i++) { if (frame(a, dt)) started = t; t += dt; }
  assert(started != null && started >= FIRST_MIN - .1 && started <= FIRST_MIN + FIRST_SPAN + .1, `started at ${started}`);
  const counts = [];
  let was = true;
  for (let i = 0; i < 60 * 60; i++) {
    const p = frame(a, dt);
    if (p && !was) counts.push(a.muggerCosh.cur.n);
    was = !!p;
  }
  assert(counts.length >= 2, `turns: ${counts}`);
  for (const n of counts) assert(n >= SLAPS_MIN && n <= SLAPS_MAX);
  while (a.muggerCosh.cur) frame(a, dt);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back to rest`));
});

test('walking, an attack or death fades it out quickly and it returns to rest', () => {
  for (const cut of ['walk', 'attack', 'die']) {
    const a = make('mugger'), rest = snap(a), dt = 1 / 60;
    let n = 0;
    while (!a.muggerCosh?.cur && n++ < 60 * 30) frame(a, dt);
    for (let i = 0; i < 60; i++) frame(a, dt);
    assert(a.muggerCosh.cur, `${cut}: slapping`);
    if (cut === 'attack') enqueueAction(a.actions, {kind: 'attack', type: 'weapon', dir: [1, 0]});
    if (cut === 'die') enqueueAction(a.actions, {kind: 'die'});
    for (let i = 0; i < 12; i++) frame(a, dt, cut === 'walk');
    assert(!a.muggerCosh.cur || a.muggerCosh.f < .2, `${cut}: faded`);
    if (cut === 'walk') {
      for (let i = 0; i < 30; i++) frame(a, dt, true);
      snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `${cut}: part ${i} back to rest`));
    }
  }
});
