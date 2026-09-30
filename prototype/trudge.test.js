import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, updateActions, clearActionPose} from './actions.js';
import {slideTo} from './slide.js';
import {updateTrudge, trudgeKind, trudgePose, TRUDGE} from './trudge.js';
import {jawReach} from './jaw.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};

// One frame as live.js runs it: the slide, the generic leg swing and body bob, the trudge, the actions.
function frame(a, t, dt) {
  clearActionPose(a, a.actions);
  const walking = a.g.position.distanceTo(a.target) > .025;
  slideTo(a, dt);
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .015;
  const p = updateTrudge(a, dt, walking);
  updateActions(a, a.actions, dt);
  return {p, walking};
}
const snap = a => [...a.legs.map(l => l.rotation.x), a.body.rotation.z, a.head?.rotation.x ?? 0, a.head?.rotation.z ?? 0, a.jaw?.rotation.x ?? 0,
  ...(a.arms || []).map(r => r.rotation.x)];

test('trudge poses are finite and within their stride, lurch and dip', () => {
  for (const kind of Object.keys(TRUDGE)) {
    const T = TRUDGE[kind];
    for (let i = 0; i <= 400; i++) {
      const p = trudgePose(kind, Math.PI * 2 * i / 400);
      for (const v of [...p.legs, p.bob, p.roll, p.nod, p.shake, p.jaw, ...p.arms]) assert(Number.isFinite(v));
      assert(p.jaw >= 0 && p.jaw <= (T.clack || 0));
      assert(Math.abs(p.shake) <= (T.rattle || 0));
      assert.equal(p.arms[0], -p.arms[1]);
      assert(Math.abs(p.arms[0]) <= (T.arm || 0) + 1e-12 && p.nod >= 0 && p.nod <= (T.nod || 0));
      assert.equal(p.legs[0], -p.legs[1]);
      assert(Math.abs(p.legs[0]) <= T.stride && Math.abs(p.roll) <= T.roll && p.bob <= 0 && p.bob >= -T.dip);
    }
    assert.deepEqual(trudgePose(kind, 1, 0), {legs: [0, 0], bob: 0, roll: 0, nod: 0, arms: [0, 0], shake: 0, jaw: 0});
  }
  assert.equal(trudgeKind(make('ghoul', 'Z')), 'ghoul');
  assert.equal(trudgeKind(make('skeleton', 'Z')), 'skeleton');
  assert.equal(trudgeKind(make('human zombie', 'Z')), 'zombie');
  assert.equal(trudgeKind(make('iron golem', "'")), 'golem');
  for (const [n, s] of [['straw golem', "'"], ['gnome mummy', 'M'], ['brown pudding', 'P'], ['jackal', 'd']]) {
    const a = make(n, s);
    assert.equal(trudgeKind(a), null, n);
    assert.equal(updateTrudge(a, 1 / 60, true), null, n);
  }
});

test('a zombie and a golem trudge slowly across a cell and settle back to their exact rest pose', () => {
  for (const [name, sym, kind] of [['human zombie', 'Z', 'zombie'], ['kobold zombie', 'Z', 'zombie'], ['stone golem', "'", 'golem'], ['clay golem', "'", 'golem'], ['ghoul', 'Z', 'ghoul'], ['skeleton', 'Z', 'skeleton']]) {
    const a = make(name, sym), T = TRUDGE[kind], dt = 1 / 60;
    const jawRest = a.jaw?.rotation.x ?? 0;
    const armRest = (a.arms || []).map(r => r.rotation.x), headRest = a.head?.rotation.x ?? 0, tiltRest = a.head?.rotation.z ?? 0;
    a.g.position.set(0, 0, 0); a.target = new THREE.Vector3(1, 0, 1);
    const rest = snap(a);
    let t = 0, prev = snap(a), worst = 0, walkedFrames = 0, peak = 0;
    for (let i = 0; i < 300; i++, t += dt) {
      const {walking} = frame(a, t, dt);
      const now = snap(a);
      now.forEach(v => assert(Number.isFinite(v), `${name} ${i}`));
      assert(Number.isFinite(a.body.position.y));
      if (walking) walkedFrames++;
      if (walking && a.trudge.w > .999) {
        // fully blended in: only the slow stride remains, no generic scurry
        a.legs.forEach(l => assert(Math.abs(l.rotation.x) <= T.stride + 1e-9, `${name} ${i} ${l.rotation.x}`));
        assert(Math.abs(a.body.rotation.z) <= T.roll + 1e-9);
        assert(a.body.position.y <= 1e-9 && a.body.position.y >= -T.dip - 1e-9);
        if (a.head) assert(a.head.rotation.x - headRest >= -1e-9 && a.head.rotation.x - headRest <= (T.nod || 0) + 1e-9);
        if (a.head) assert(Math.abs(a.head.rotation.z - tiltRest) <= (T.rattle || 0) + 1e-9, `${name} rattle`);
        (a.arms || []).forEach((r, k) => assert(Math.abs(r.rotation.x - armRest[k]) <= (T.arm || 0) + 1e-9, `${name} arm ${k}`));
        if (a.jaw) assert(a.jaw.rotation.x - jawRest >= -1e-9 && a.jaw.rotation.x - jawRest <= (T.clack || 0) + 1e-9, `${name} jaw`);
      }
      peak = Math.max(peak, Math.abs(a.legs[0].rotation.x));
      if (i > 0) worst = Math.max(worst, ...now.map((v, k) => Math.abs(v - prev[k])));
      prev = now;
    }
    assert(walkedFrames > 60, `${name} slid for ${walkedFrames} frames`);
    assert(peak > T.stride * .5, `${name} took real steps (${peak})`);
    // at most rate × stride ≈ .04 rad a frame (the ghoul's lope ≈ .07; the skeleton's snap steepens
    // its stride by snap/tanh(snap) ≈ 2.2, to ≈ .11), plus the blend; the generic swing moved up to .15
    const steep = T.snap ? T.snap / Math.tanh(T.snap) : 1;
    assert(worst < Math.max(.06, T.rate * T.stride * steep * dt + .01), `${name} smooth (${worst})`);
    snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-12, `${name} back to rest ${k}: ${v} vs ${rest[k]}`));
    assert.equal(a.trudge.w, 0);
    assert.equal(a.trudge.roll, 0);
  }
});

test('a dead zombie stops trudging and leaves no lurch behind', () => {
  const a = make('human zombie', 'Z'), dt = 1 / 60;
  for (let i = 0; i < 60; i++) updateTrudge(a, dt, true);
  assert(a.trudge.w > .9);
  a.actions.dead = true;
  for (let i = 0; i < 120; i++) { a.body.rotation.z += 0; updateTrudge(a, dt, true); }
  assert.equal(a.trudge.w, 0);
  assert.equal(a.trudge.roll, 0);
  assert(Math.abs(a.body.rotation.z) < 1e-12);
  assert.equal(updateTrudge(a, NaN, false).roll, 0);
});

// Straw golem loose limbs (straw-flop.js). Kept here so package.json's test list is unchanged.
import {updateStrawFlop, clearStrawFlop, isStrawFlop, FLOP} from './straw-flop.js';

const limbs = a => [...a.arms.flatMap(r => [r.rotation.x, r.rotation.z]), a.head.rotation.x, a.head.rotation.z];

test('straw golem limbs flop on the move, stay bounded and settle back to rest', () => {
  const a = make('straw golem', "'");
  a.target = new THREE.Vector3(0, 0, 0);
  assert(isStrawFlop(a));
  assert(!isStrawFlop(make('iron golem', "'")));
  assert.equal(updateStrawFlop(make('iron golem', "'"), 1 / 60, 0, false), null);
  const rest = limbs(a);
  const dt = 1 / 60;
  let t = 0, prev = limbs(a), maxStep = 0, maxArm = 0, swung = 0;
  const run = (secs, walking, dead = false) => {
    for (let i = 0; i < secs * 60; i++) {
      t += dt;
      if (dead) a.actions.dead = true;
      clearActionPose(a, a.actions);
      const w = walking && a.g.position.distanceTo(a.target) > .025;
      if (walking) { const d = a.target.clone().sub(a.g.position); if (d.length() > .025) a.g.rotation.y = Math.atan2(d.x, d.z); }
      slideTo(a, dt);
      const o = updateStrawFlop(a, dt, t, w);
      updateActions(a, a.actions, dt);
      const now = limbs(a);
      now.forEach((v, k) => { assert(Number.isFinite(v)); maxStep = Math.max(maxStep, Math.abs(v - prev[k])); });
      prev = now;
      for (const [x, z] of o.arms) { maxArm = Math.max(maxArm, Math.abs(x), Math.abs(z)); }
      swung = Math.max(swung, Math.abs(o.arms[0][0]));
      assert(Math.abs(o.head[0]) <= FLOP.head.max && Math.abs(o.head[1]) <= FLOP.head.max);
    }
  };
  // idle: only a faint stir
  run(4, false);
  assert(maxArm < .08, `idle stir ${maxArm}`);
  // walk one cell east, then a diagonal back: the arms swing out and ring
  a.target = new THREE.Vector3(1, 0, 0); run(3, true);
  a.target = new THREE.Vector3(0, 0, 1); run(3, true);
  assert(swung > .12, `arms barely moved: ${swung}`);
  assert(maxArm <= FLOP.arm.max + 1e-9);
  assert(maxStep < .08, `limb jumped ${maxStep} rad in a frame`);
  // dead: no breeze or flap, so the springs ring down to the model's rest pose
  run(6, false, true);
  limbs(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-3, `limb ${k} off rest by ${v - rest[k]}`));
  clearStrawFlop(a);
  limbs(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-12));
});

test('straw golem flop ignores teleports and bad frame times', () => {
  const a = make('straw golem', "'");
  updateStrawFlop(a, 1 / 60, 0, false);
  a.g.position.set(40, 0, -30);
  const o = updateStrawFlop(a, 1 / 60, .02, false);
  for (const [x, z] of o.arms) assert(Math.abs(x) < .02 && Math.abs(z) < .02);
  for (const dt of [NaN, -1, Infinity, 0]) {
    const p = updateStrawFlop(a, dt, NaN, true);
    [...p.arms.flat(), ...p.head].forEach(v => assert(Number.isFinite(v)));
  }
});

test('the skeleton snaps between strides and its skull rattles after each footfall, then dies away', () => {
  const T = TRUDGE.skeleton, N = 2000;
  // snap: the legs spend far longer near full stride than a sine does
  let held = 0, sineHeld = 0;
  for (let i = 0; i < N; i++) {
    const ph = Math.PI * 2 * i / N;
    if (Math.abs(trudgePose('skeleton', ph).legs[0]) > T.stride * .8) held++;
    if (Math.abs(Math.sin(ph)) > .8) sineHeld++;
  }
  assert(held > sineHeld * 1.4, `held ${held} vs ${sineHeld}`);
  // rattle: none at the footfall itself, a real shake just after, almost nothing left before the next
  const at = q => trudgePose('skeleton', Math.PI / 2 + q).shake;
  assert(Math.abs(at(0)) < 1e-12);
  let peak = 0;
  for (let q = 0; q < Math.PI / 3; q += .01) peak = Math.max(peak, Math.abs(at(q)));
  assert(peak > T.rattle * .4, `rattle peak ${peak}`);
  assert(Math.abs(at(Math.PI - 1e-6)) < T.rattle * .002);
  // continuous across the next footfall
  assert(Math.abs(at(Math.PI - 1e-6) - at(Math.PI + 1e-6)) < T.rattle * .002);
  // the other kinds don't rattle
  for (const k of ['zombie', 'golem', 'ghoul']) assert.equal(trudgePose(k, 2).shake, 0);
});

test('the skeleton\'s jaw clacks a few times after each footfall and shuts before the next', () => {
  const T = TRUDGE.skeleton;
  const at = q => trudgePose('skeleton', Math.PI / 2 + q).jaw;
  assert(at(0) < 1e-12);
  // count the clacks (local maxima) in one step and check they die away
  const peaks = [];
  let prev = at(0), rising = true;
  for (let q = .005; q < Math.PI; q += .005) {
    const v = at(q);
    if (rising && v < prev) peaks.push(prev);
    rising = v >= prev; prev = v;
  }
  assert(peaks.length >= 2 && peaks.length <= T.chatter, `clacks ${peaks.length}`);
  assert(peaks[0] > T.clack * .4, `first clack ${peaks[0]}`);
  for (let i = 1; i < peaks.length; i++) assert(peaks[i] < peaks[i - 1]);
  assert(at(Math.PI - 1e-6) < 1e-4 && Math.abs(at(Math.PI - 1e-6) - at(Math.PI + 1e-6)) < 1e-4);
  for (const k of ['zombie', 'golem', 'ghoul']) assert.equal(trudgePose(k, 2).jaw, 0);
  // on the model: scaled by the jaw's reach, and the walk carries it
  const a = make('skeleton', 'Z'), rest = a.jaw.rotation.x, dt = 1 / 60;
  a.g.position.set(0, 0, 0); a.target = new THREE.Vector3(2, 0, 0);
  let open = 0, clacks = 0, was = 0;
  for (let i = 0; i < 240; i++) {
    // keep it walking: a new cell ahead whenever it gets close
    if (a.g.position.distanceTo(a.target) < .3) a.target.x += 1;
    frame(a, i * dt, dt);
    const d = a.jaw.rotation.x - rest;
    assert(d >= -1e-12 && d <= T.clack * jawReach(a) + 1e-12);
    if (d > .02 && was <= .02) clacks++;
    was = d; open = Math.max(open, d);
  }
  assert(open > T.clack * jawReach(a) * .4, `jaw opened ${open}`);
  assert(clacks >= 4, `clacks ${clacks}`);
  // stopped: it settles exactly back to rest
  for (let i = 0; i < 120; i++) updateTrudge(a, dt, false);
  assert.equal(a.trudge.w, 0);
  assert.equal(a.jaw.rotation.x, rest);
});
