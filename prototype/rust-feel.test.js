import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as R from './rust-feel.js';

const dt = 1 / 60;
function mon(name, symbol = 'R') { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 1}); a.species = name; return a; }
const parts = a => [...a.feelers, a.feelHead];
const pose = a => [...parts(a).flatMap(o => o.rotation.toArray().slice(0, 3)), a.vane.rotation.z];
const tipOf = (a, i) => { a.g.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(a.feelers[i]); return box.getCenter(new THREE.Vector3()); };

test('rust monsters and disenchanters feel; their feelers are pivots at the head; others do not', () => {
  for (const name of ['rust monster', 'disenchanter']) {
    const a = mon(name);
    assert.equal(a.rustFeel, name);
    assert.equal(a.feelers.length, 2);
    for (const f of a.feelers) { assert.ok(f.isGroup && f.parent === a.feelHead); assert.ok(f.children.length >= 2, 'feeler meshes live in its group'); }
    assert.ok(a.vane?.isGroup && a.vane.parent === a.tail);
    assert.ok(R.updateRustFeel(a, dt, 0, false), name);
  }
  assert.equal(mon('unknown r', 'R').rustFeel, 'rust monster');
  for (const [name, s] of [['troll', 'T'], ['newt', ':'], ['jackal', 'd']]) assert.equal(R.updateRustFeel(mon(name, s), dt, 0, false), null, name);
});

test('the feelers still sit where they did: tips up, forward and apart', () => {
  const a = mon('rust monster');
  const l = tipOf(a, 0), r = tipOf(a, 1);
  assert.ok(l.x < -.05 && r.x > .05, `apart ${l.x} ${r.x}`);
  assert.ok(l.y > .35 && r.y > .35 && l.z > .35, `up and forward ${l.toArray()}`);
});

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .005) {
    const p = R.tastePose(u), q = R.lashPose(u);
    for (const v of [p.dip, ...p.taps, q.rear, q.lash]) assert.ok(v >= 0 && v <= 1, `${u}`);
  }
  assert.deepEqual(R.tastePose(1), {dip: 0, taps: [0, 0]});
  assert.deepEqual(R.lashPose(1), {rear: 0, lash: 0});
  assert.ok(R.tastePose(.5).dip > .99 && R.lashPose(.2).rear > .7 && R.lashPose(.45).lash > .95);
});

test('a rust monster quests, tastes the floor, smells the hero, lashes, flinches and rests after death', () => {
  const a = mon('rust monster');
  a.g.position.set(0, 0, 0);
  const rest = pose(a);
  const far = new THREE.Vector3(20, 0, 0), near = new THREE.Vector3(2, 0, 1.2);
  updateFidget(a, 0, 0, false, far);
  const st = a.rustFeel_;
  let t = 0, tastes = 0, was = false, wander = 0, jerk = 0, prev = pose(a), ticks = 0, lastSpin = st.spin;
  for (let i = 0; i < 60 * 20; i++) {
    t += dt; updateFidget(a, dt, t, false, far);
    if (st.taste != null && !was) tastes++;
    was = st.taste != null;
    const p = pose(a);
    assert.ok(p.every(Number.isFinite));
    wander = Math.max(wander, Math.abs(p[1] - rest[1]), Math.abs(p[4] - rest[4]));
    for (let k = 0; k < 6; k++) jerk = Math.max(jerk, Math.abs(p[k] - prev[k]));
    for (let k = 0; k < 6; k++) assert.ok(Math.abs(p[k] - rest[k]) < 1.5, `feeler ${k} ${p[k] - rest[k]}`);
    if (st.spin - lastSpin > .02) ticks++;
    lastSpin = st.spin;
    prev = p;
  }
  assert.ok(tastes >= 2, `it tastes the floor (${tastes})`);
  assert.ok(wander > .2, `the feelers quest (${wander})`);
  assert.ok(jerk < .25, `no frame jumps (${jerk})`);
  assert.ok(ticks > 10, `the vane ticks round (${ticks})`);

  // the hero near: both feelers turn toward them (+x side) and the vane whirrs
  st.taste = null; st.wait = 99;
  const spin0 = st.spin;
  for (let i = 0; i < 90; i++) updateFidget(a, dt, t += dt, false, near);
  assert.ok(st.near > .6, `excited (${st.near})`);
  for (const f of a.feelers) assert.ok(f.rotation.y > .2, `feeler aims at the hero (${f.rotation.y})`);
  assert.ok(a.feelHead.rotation.y > .2, `head turns (${a.feelHead.rotation.y})`);
  assert.ok(st.spin - spin0 > 6, `vane whirrs (${st.spin - spin0})`);

  // the lash: rear back, then the feelers whip forward past rest
  a.actions = {current: {kind: 'attack'}, age: 0, u: .2, queue: []};
  updateFidget(a, dt, t += dt, true, near);
  const reared = a.feelers[0].rotation.x;
  a.actions.u = .45;
  for (let i = 0; i < 20; i++) updateFidget(a, dt, t += dt, true, near);
  assert.ok(a.feelers[0].rotation.x - reared > 1.2, `lashes forward (${reared} -> ${a.feelers[0].rotation.x})`);

  // a blow: the feelers flinch back
  a.actions = {current: {kind: 'hit'}, age: 0, u: .1, queue: []};
  const before = st.flinch;
  updateFidget(a, dt, t += dt, true, near);
  assert.ok(st.flinch > .9 && before < .9, 'flinches');
  a.actions = null;
  for (let i = 0; i < 120; i++) updateFidget(a, dt, t += dt, false, near);
  assert.ok(st.flinch < .01, 'creeps forward again');

  // death: back to rest exactly, vane on a blade-symmetric angle
  a.actions = {dead: true, current: null, queue: []};
  for (let i = 0; i < 60 * 8; i++) updateFidget(a, dt, t += dt, false, near);
  const p = pose(a);
  for (let k = 0; k < 9; k++) assert.ok(Math.abs(p[k] - rest[k]) < 1e-6, `rest ${k}: ${p[k]} vs ${rest[k]}`);
  const dv = (p[9] - rest[9]) / Math.PI;
  assert.ok(Math.abs(dv - Math.round(dv)) < 1e-6, `vane symmetric (${dv})`);
});

test('a disenchanter glides rather than jerks and its vane turns smoothly', () => {
  const a = mon('disenchanter');
  updateFidget(a, 0, 0, false, null);
  const st = a.rustFeel_;
  let t = 0, prev = pose(a), jerk = 0, back = 0;
  for (let i = 0; i < 60 * 15; i++) {
    t += dt; updateFidget(a, dt, t, false, null);
    const p = pose(a);
    // the questing alone (a taste dips the feelers on its own curve)
    if (st.taste == null) for (let k = 0; k < 6; k++) jerk = Math.max(jerk, Math.abs(p[k] - prev[k]));
    if (p[9] < prev[9] - 1e-9) back++;
    prev = p;
  }
  assert.ok(jerk < .05, `glides (${jerk})`);
  assert.equal(back, 0, 'vane never turns back');
  assert.ok(st.spin > 5, `vane turns (${st.spin})`);
});
