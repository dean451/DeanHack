import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as J from './ant-jaws.js';

const dt = 1 / 60;
function mon(name, symbol = 'a') { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 1}); a.species = name; return a; }
const kinds = ['giant ant', 'soldier ant', 'fire ant', 'snow ant'];
const opening = a => a.jaws.map((j, i) => (j.rotation.y - a.antJaws_.rest[i]) * j.userData.side);

test('ants have hinged jaws and work them; others do not', () => {
  for (const name of kinds) {
    const a = mon(name);
    assert.equal(a.antJaws, name);
    assert.equal(a.jaws.length, 2);
    for (const j of a.jaws) assert.ok(j.isGroup && j.parent === a.head && j.children.some(o => o.isMesh), name);
    assert.deepEqual(a.jaws.map(j => j.userData.side), [1, -1]);
    assert.ok(J.updateAntJaws(a, dt, 0, false), name);
  }
  assert.equal(mon('army ant').antJaws, 'giant ant');
  for (const [name, s] of [['giant beetle', 'a'], ['locust', 'a'], ['newt', ':'], ['bat', 'B']]) assert.equal(J.updateAntJaws(mon(name, s), dt, 0, false), null, name);
});

test('the jaw meshes sit where they did in the head mesh: right and left mirror, tips cross in front', () => {
  const a = mon('soldier ant');
  a.g.updateMatrixWorld(true);
  const [r, l] = a.jaws.map(j => new THREE.Box3().setFromObject(j));
  assert.ok(Math.abs(r.max.x + l.min.x) < 1e-6 && Math.abs(r.min.x + l.max.x) < 1e-6, 'mirrored');
  assert.ok(r.min.x < 0 && l.max.x > 0, 'the tips cross the middle');
  const head = new THREE.Box3().setFromObject(a.head);
  assert.ok(r.max.z >= head.max.z - 1e-6, 'the jaws are the front of the head');
});

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .005) {
    for (const v of [J.clackPose(u), J.burstPose(u, 3)]) assert.ok(v >= -.36 && v <= 1, `${u} ${v}`);
    const t = J.threatPose(u);
    assert.ok(t.rear >= -.41 && t.rear <= 1 && t.spread >= 0 && t.spread <= 1 && t.shake >= 0 && t.shake <= 1 && t.snap >= -.35 && t.snap <= 0, `${u}`);
    const b = J.bitePose(u);
    assert.ok(b.open >= -.36 && b.open <= 1 && b.lunge >= 0 && b.lunge <= 1, `${u}`);
  }
  assert.equal(J.clackPose(1), 0);
  assert.deepEqual(J.threatPose(1), {rear: 0, spread: 0, shake: 0, snap: 0});
  assert.deepEqual(J.bitePose(1), {open: 0, lunge: 0});
  // the poses are continuous: no step bigger than a frame's worth
  for (const f of [u => J.clackPose(u), u => J.threatPose(u).rear, u => J.threatPose(u).spread, u => J.bitePose(u).open])
    for (let u = 0; u < 1; u += .002) assert.ok(Math.abs(f(u + .002) - f(u)) < .05, `${u}`);
});

test('the jaws clack alone, gape and threaten at the hero, bite, and stay finite and in bounds', () => {
  for (const name of kinds) {
    const a = mon(name), L = J.LOOKS[name], hero = new THREE.Vector3(1.5, 0, 1.5);
    let clacks = 0, threats = 0, lastC = null, lastT = null, alone = 0, near = 0, n1 = 0, n2 = 0, lo = Infinity, hi = -Infinity, rear = 0, step = 0, prev = null;
    for (let i = 0; i < 60 * 40; i++) {
      const close = i > 60 * 20, T = i * dt;
      if (i % 300 === 299 && close) a.actions = {current: {kind: 'attack'}, age: 0, u: 0};
      if (a.actions?.current?.kind === 'attack') { a.actions.u += dt / .5; if (a.actions.u >= 1) a.actions = null; }
      updateFidget(a, dt, T, !!a.actions, close ? hero : null);
      const st = a.antJaws_;
      for (const v of [...a.jaws.map(j => j.rotation.y), ...a.head.rotation.toArray().slice(0, 3)]) assert.ok(Number.isFinite(v), name);
      const o = opening(a);
      for (const v of o) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      // clacks and bites slam shut in two or three frames on purpose, and the tremble is fast;
      // everything else moves smoothly (checked with the tremble off, below)
      if (prev && !a.actions && st.clack == null && lastC == null) step = Math.max(step, ...o.map((v, k) => Math.abs(v - prev[k])));
      if (i === 0) st.look = {...L, trem: 0};
      prev = o;
      if (close) { near += o[0]; n2++; } else { alone += o[0]; n1++; }
      rear = Math.min(rear, a.head.rotation.x);
      if (st.clack != null && lastC == null) clacks++;
      if (st.threat != null && lastT == null) threats++;
      lastC = st.clack; lastT = st.threat;
      assert.ok(Math.abs(a.head.rotation.y) < .9 && Math.abs(a.head.rotation.x) < .7, name);
    }
    assert.ok(lo >= -J.SHUT - 1e-9 && hi <= L.max + 1e-9, `${name} ${lo}..${hi}`);
    assert.ok(hi > L.threat * .8, `${name} opens wide (${hi})`);
    assert.ok(near / n2 > alone / n1 + .1, `${name} gapes at the hero`);
    assert.ok(clacks >= 3, `${name} clacks ${clacks}`);
    assert.ok(threats >= 2, `${name} threats ${threats}`);
    assert.ok(rear < -.15, `${name} rears ${rear}`);
    assert.ok(step < .1, `${name} biggest per-frame step ${step}`);
  }
});

test('on death the jaws and head ease back to the exact rest pose', () => {
  for (const name of kinds) {
    const a = mon(name), rest = [...a.jaws.map(j => j.rotation.y), a.head.rotation.x, a.head.rotation.y];
    const hero = new THREE.Vector3(1, 0, 1);
    for (let i = 0; i < 60 * 6; i++) updateFidget(a, dt, i * dt, false, hero);
    a.actions = {dead: true};
    for (let i = 0; i < 60 * 6; i++) updateFidget(a, dt, 6 + i * dt, false, hero);
    const now = [...a.jaws.map(j => j.rotation.y), a.head.rotation.x, a.head.rotation.y];
    now.forEach((v, i) => assert.ok(Math.abs(v - rest[i]) < 1e-9, `${name} ${i}: ${v} vs ${rest[i]}`));
  }
});
