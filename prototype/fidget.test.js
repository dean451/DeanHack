import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateGait} from './gait.js';
import {FIDGETS, fidgetPose, fidgetsFor, updateFidget, FIRST_MIN, FIRST_SPAN} from './fidget.js';

const parts = a => [a.body, ...a.legs, ...(a.arms || []), a.hat, a.beard, a.pick].filter(Boolean);
const snapshot = a => parts(a).map(p => ({p, pos: p.position.clone(), quat: p.quaternion.clone()}));
const atRest = (snap, eps = 1e-6) => snap.every(({p, pos, quat}) => p.position.distanceTo(pos) < eps && Math.abs(Math.abs(p.quaternion.dot(quat)) - 1) < eps);

// Mimic live.js's idle frame: its generic leg and body writes, then the gait and the fidget.
function frame(a, t, dt, busy = false) {
  a.legs.forEach(l => l.rotation.x = 0);
  a.body.position.y = 0;
  updateGait(a, dt, busy);
  return updateFidget(a, dt, t, busy);
}

// Run until the actor starts `kind` (forcing the choice), returning the time.
function startFidget(a, kind, dt = 1 / 60) {
  let t = 0;
  frame(a, t, dt);
  a.fidget.wait = dt / 2;
  const list = fidgetsFor(a);
  // pick deterministically by steering the PRNG until the draw lands on `kind`
  for (let seed = 1; seed < 500; seed++) {
    const s = (seed * 1103515245 + 12345) % 2147483648;
    if (list[Math.floor(s / 2147483648 * list.length)] === kind) { a.fidget.seed = seed; break; }
  }
  t += dt;
  const r = frame(a, t, dt);
  assert.equal(r?.kind, kind);
  return t;
}

test('fidget poses are finite, bounded and zero at both ends', () => {
  for (const kind of Object.keys(FIDGETS)) {
    for (let i = 0; i <= 100; i++) {
      const p = fidgetPose(kind, i / 100, i * .07);
      for (const v of [p.yaw, p.roll, p.lean, p.bob, p.pick, ...p.arms.flat()]) {
        assert.ok(Number.isFinite(v), kind);
        assert.ok(Math.abs(v) < 3.7, `${kind} ${v}`);
      }
    }
    for (const u of [0, 1]) {
      const p = fidgetPose(kind, u, 3.1);
      for (const v of [p.yaw, p.roll, p.lean, p.bob, p.pick, ...p.arms.flat()]) assert.ok(Math.abs(v) < 1e-9, `${kind} at ${u}: ${v}`);
    }
  }
  assert.deepEqual(fidgetsFor(createCreature({name: 'jackal'})), []);
  assert.deepEqual(fidgetsFor(createCreature({name: 'dwarf king'})), ['look']);
});

test('a still gnome waits a few seconds, looks around, and returns exactly to rest', () => {
  const a = createCreature({name: 'gnome'});
  const dt = 1 / 60;
  frame(a, 0, dt);
  const rest = snapshot(a);
  const feet = a.legs.map(l => l.getWorldPosition(new THREE.Vector3()));
  let t = 0, first = null, left = 0, right = 0;
  for (let i = 0; i < 60 * 9; i++) {
    t += dt;
    const r = frame(a, t, dt);
    if (r && first == null) first = t;
    if (r) {
      left = Math.max(left, r.pose.yaw); right = Math.min(right, r.pose.yaw);
      a.g.updateMatrixWorld(true);
      // the feet stay planted while the body turns above them
      a.legs.forEach((l, j) => assert.ok(l.getWorldPosition(new THREE.Vector3()).distanceTo(feet[j]) < 1e-6));
    }
    if (first != null && !r) break;
  }
  assert.ok(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first fidget at ${first}`);
  assert.ok(left > .4 && right < -.4, `looked ${left} ${right}`);
  assert.ok(atRest(rest), 'gnome back at rest');
});

test('a hobbit scratches its head with the right hand', () => {
  const a = createCreature({name: 'hobbit'});
  const dt = 1 / 60;
  frame(a, 0, dt);
  const rest = snapshot(a);
  let t = startFidget(a, 'scratch'), closest = Infinity, r;
  const head = new THREE.Vector3();
  do {
    t += dt;
    r = frame(a, t, dt);
    a.g.updateMatrixWorld(true);
    const hand = new THREE.Vector3(0, -.3, 0).applyMatrix4(a.arms[1].matrixWorld);
    head.set(0, .87, .02).applyMatrix4(a.body.matrixWorld);
    closest = Math.min(closest, hand.distanceTo(head));
    for (const v of hand.toArray()) assert.ok(Number.isFinite(v));
  } while (r);
  // the hand (r .065) rubs the side of the head (r .18) and the hair above it
  assert.ok(closest > .12 && closest < .22, `hand to head ${closest}`);
  assert.ok(atRest(rest), 'hobbit back at rest');
});

test('a dwarf plants its pick on the floor and leans on it', () => {
  const a = createCreature({name: 'dwarf'});
  const dt = 1 / 60;
  frame(a, 0, dt);
  const rest = snapshot(a);
  let t = startFidget(a, 'lean'), r, planted = 0, lowest = Infinity, gap = Infinity;
  do {
    t += dt;
    r = frame(a, t, dt);
    a.g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a.pick);
    if (r && r.pose.pick > .99) {
      planted++;
      lowest = Math.min(lowest, box.min.y);
      const butt = new THREE.Vector3(0, -.125, 0).applyMatrix4(a.pick.matrixWorld);
      const hand = new THREE.Vector3(0, -.38, 0).applyMatrix4(a.arms[0].matrixWorld);
      gap = Math.min(gap, butt.distanceTo(hand));
    }
    // the pick never swings back through the body
    assert.ok(box.max.z > .05, `pick behind the dwarf at ${t}`);
  } while (r);
  assert.ok(planted > 60, 'held the lean');
  assert.ok(lowest > -.03 && lowest < .05, `pick head on the floor (${lowest})`);
  assert.ok(gap < .08, `hand on the pick butt (${gap})`);
  assert.ok(atRest(rest), 'dwarf back at rest');
});

test('walking or an action cuts a fidget short, and nothing drifts over a long idle', () => {
  const a = createCreature({name: 'dwarf lord'});
  const dt = 1 / 60;
  frame(a, 0, dt);
  const rest = snapshot(a);
  let t = startFidget(a, 'lean');
  for (let i = 0; i < 60; i++) frame(a, t += dt, dt);
  assert.ok(a.fidget.cur, 'mid-lean');
  // starts walking: gone within about 0.5 s
  let gone = null;
  for (let i = 0; i < 60 && gone == null; i++) if (!frame(a, t += dt, dt, true)) gone = i * dt;
  assert.ok(gone != null && gone < .6, `faded in ${gone}`);
  // stand still for a long while: several fidgets come and go, always ending at rest
  let starts = 0, was = false;
  for (let i = 0; i < 60 * 40; i++) {
    const r = frame(a, t += dt, dt);
    if (r && !was) starts++;
    was = !!r;
    for (const p of parts(a)) for (const v of [...p.position.toArray(), ...p.quaternion.toArray()]) assert.ok(Number.isFinite(v));
  }
  assert.ok(starts >= 3, `${starts} fidgets in 40 s`);
  while (frame(a, t += dt, dt)) {}
  assert.ok(atRest(rest, 1e-5), 'rest after a long idle');
  // the dead don't fidget
  a.actions = {dead: true};
  a.fidget.wait = dt / 2;
  for (let i = 0; i < 60; i++) assert.equal(frame(a, t += dt, dt), null);
});

test('GLB-swapped and non-folk actors are left alone', () => {
  const g = createCreature({name: 'gnome'});
  g.asset = {};
  assert.equal(updateFidget(g, .1, 1, false), null);
  assert.equal(g.fidget, undefined);
  const j = createCreature({name: 'jackal'});
  assert.equal(updateFidget(j, .1, 1, false), null);
});

test('the evil eye darts its eye about while still, eases back to centre when busy, and never drifts', async () => {
  const {YAW, PITCH, TREMOR} = await import('./glance.js');
  const a = createCreature({name: 'evil eye'});
  a.species = 'evil eye';
  const h = a.head, rest = h.quaternion.clone();
  const dt = 1 / 60;
  let t = 0, prev = null, flicks = 0, centres = 0, maxYaw = 0, maxPitch = 0;
  for (let i = 0; i < 60 * 30; i++, t += dt) {
    updateFidget(a, dt, t, false);
    const {x, y, z} = h.rotation;
    for (const v of [x, y, z]) assert.ok(Number.isFinite(v));
    assert.ok(Math.abs(y) <= YAW + TREMOR + 1e-9 && Math.abs(x) <= PITCH + TREMOR + 1e-9, `${x} ${y}`);
    maxYaw = Math.max(maxYaw, Math.abs(y)); maxPitch = Math.max(maxPitch, Math.abs(x));
    // a flick covers at most the whole range in a few frames; never a jump bigger than one flick's steepest frame
    if (prev) assert.ok(Math.hypot(x - prev.x, y - prev.y) < .5, 'no teleport');
    if (a.glance.u === 0) { flicks++; if (!a.glance.to.yaw && !a.glance.to.pitch) centres++; }
    prev = {x, y};
  }
  assert.ok(flicks >= 12 && flicks <= 90, `flicks ${flicks}`);
  assert.ok(centres >= 2, `centres ${centres}`);
  assert.ok(maxYaw > .3 && maxPitch > .1, `${maxYaw} ${maxPitch}`);
  // Walking or an action eases it back to exactly rest within ~0.1 s, then it stays put.
  for (let i = 0; i < 12; i++, t += dt) updateFidget(a, dt, t, true);
  assert.ok(Math.abs(Math.abs(h.quaternion.dot(rest)) - 1) < 1e-4, 'nearly centred after .2 s');
  for (let i = 0; i < 60; i++, t += dt) updateFidget(a, dt, t, true);
  assert.ok(Math.abs(Math.abs(h.quaternion.dot(rest)) - 1) < 1e-9, 'exactly centred');
  // It resumes after a short hold, and dying centres it for good.
  let moved = false;
  for (let i = 0; i < 60 * 4; i++, t += dt) { updateFidget(a, dt, t, false); moved ||= Math.abs(h.rotation.y) > .05; }
  assert.ok(moved, 'resumes');
  a.actions = {dead: true, queue: []};
  for (let i = 0; i < 60; i++, t += dt) updateFidget(a, dt, t, false);
  assert.ok(Math.abs(Math.abs(h.quaternion.dot(rest)) - 1) < 1e-9, 'still when dead');
  // Other hovering things are left alone.
  const f = createCreature({name: 'floating eye'});
  f.species = 'floating eye';
  if (f.head) { const q = f.head.quaternion.clone(); for (let i = 0; i < 120; i++) updateFidget(f, dt, i * dt, false); assert.ok(f.head.quaternion.equals(q)); }
});

test('the evil eye watches the hero when they are in view, follows them, and lets go when they leave', async () => {
  const {YAW, PITCH, TREMOR, aimAt} = await import('./glance.js');
  const a = createCreature({name: 'evil eye'});
  a.species = 'evil eye';
  const h = a.head, rest = h.quaternion.clone();
  const dt = 1 / 60, hero = {x: 1.5, y: 0, z: 3};
  const on = (aim) => Math.hypot(h.rotation.y - aim.yaw, h.rotation.x - aim.pitch) < .03;
  // Aim: the hero ahead and to the right means a positive yaw and an upward (negative) pitch.
  const aim0 = aimAt(a, hero);
  assert.ok(aim0.yaw > .3 && aim0.yaw <= YAW && aim0.pitch < 0 && aim0.pitch >= -PITCH, JSON.stringify(aim0));
  assert.equal(aimAt(a, {x: 0, y: 0, z: -3}), null, 'behind it');
  assert.equal(aimAt(a, {x: 0, y: 0, z: 9}), null, 'out of range');
  let t = 0, prev = null, onFrames = 0, firstOn = -1;
  for (let i = 0; i < 60 * 30; i++, t += dt) {
    // The hero strolls back and forth across the eye's view.
    hero.x = 1.8 * Math.sin(t * .4);
    updateFidget(a, dt, t, false, hero);
    const {x, y} = h.rotation;
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    assert.ok(Math.abs(y) <= YAW + TREMOR + 1e-9 && Math.abs(x) <= PITCH + TREMOR + 1e-9);
    if (prev) assert.ok(Math.hypot(x - prev.x, y - prev.y) < .5, 'no teleport');
    prev = {x, y};
    if (on(aimAt(a, hero))) { onFrames++; if (firstOn < 0) firstOn = t; }
  }
  assert.ok(firstOn >= 0 && firstOn < .3, `notices the hero quickly (${firstOn})`);
  assert.ok(onFrames > 60 * 30 * .45, `mostly watching the hero (${onFrames})`);
  // The hero walks behind it: the eye stops staring and goes back to plain glances.
  hero.x = 0; hero.z = -3;
  for (let i = 0; i < 30; i++, t += dt) updateFidget(a, dt, t, false, hero);
  assert.equal(a.glance.track, false);
  // Busy still returns it exactly to rest.
  hero.z = 3;
  for (let i = 0; i < 90; i++, t += dt) updateFidget(a, dt, t, true, hero);
  assert.ok(Math.abs(Math.abs(h.quaternion.dot(rest)) - 1) < 1e-9, 'exactly centred when busy');
});
