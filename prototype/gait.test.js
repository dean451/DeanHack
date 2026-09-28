import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {GAITS, gaitKind, gaitPose, updateGait, FLIGHT, flapStyle, beatWeight, wingFlap} from './gait.js';

const snapshot = actor => {
  const parts = [actor.body, ...actor.legs, ...(actor.arms || []), actor.hat, actor.beard, actor.pick].filter(Boolean);
  return parts.map(p => ({p, pos: p.position.clone(), quat: p.quaternion.clone()}));
};

// Mimic live.js's frame: its generic leg swing and body bob, then the gait on top.
function frame(a, t, dt, walking) {
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .015;
  return updateGait(a, dt, walking);
}

test('gait poses are finite, bounded and rest at w = 0', () => {
  for (const kind of Object.keys(GAITS)) {
    for (let i = 0; i <= 64; i++) {
      const p = gaitPose(kind, i / 64 * Math.PI * 2, 1, kind === 'dwarf' ? 1 : 0);
      for (const v of [...p.legs, ...p.arms, p.bob, p.roll, p.lean, p.hatNod, p.hatSway, p.beardSwing, p.beardSway, p.pickBob]) {
        assert.ok(Number.isFinite(v));
        assert.ok(Math.abs(v) < .6, `${kind} ${v}`);
      }
    }
    const r = gaitPose(kind, 1.3, 0);
    assert.deepEqual([...r.legs, ...r.arms, r.bob, r.roll, r.lean], [0, 0, 0, 0, 0, 0, 0]);
  }
  assert.equal(gaitPose('jackal', 1), gaitPose('gnome', 1, 0));
});

test('gnomes, hobbits and dwarves walk in character and settle exactly back to rest', () => {
  for (const name of ['gnome', 'gnome lord', 'hobbit', 'dwarf', 'dwarf lord', 'dwarf king']) {
    const a = createCreature({name});
    const kind = gaitKind(a);
    assert.ok(kind, name);
    assert.equal(a.arms.length, 2);
    if (kind === 'gnome') assert.ok(a.hat && a.beard, name);
    if (name === 'dwarf' || name === 'dwarf lord') assert.ok(a.pick && a.beard, name);
    const rest = snapshot(a);
    const restBox = new THREE.Box3().setFromObject(a.g);
    const dt = 1 / 60;
    let t = 0, peakRoll = 0, peakHat = 0, peakBeard = 0, peakPickY = 0, minBob = 0, maxBob = 0;
    for (let i = 0; i < 90; i++, t += dt) {
      const p = frame(a, t, dt, true);
      peakRoll = Math.max(peakRoll, Math.abs(p.roll));
      peakHat = Math.max(peakHat, Math.abs(p.hatNod));
      peakBeard = Math.max(peakBeard, Math.abs(p.beardSwing));
      minBob = Math.min(minBob, a.body.position.y); maxBob = Math.max(maxBob, a.body.position.y);
      if (a.pick) peakPickY = Math.max(peakPickY, a.pick.position.y);
      for (const {p: part} of rest) {
        for (const v of [...part.position.toArray(), ...part.quaternion.toArray()]) assert.ok(Number.isFinite(v));
      }
      a.g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(a.g);
      // never reaches more than 0.2 past the model's own rest bounds (the dwarf's pick already
      // leans out past the tile at rest; live.js scales the model down)
      assert.ok(restBox.clone().expandByScalar(.2).containsBox(box), `${name} sprawls`);
    }
    // character: gnomes waddle hardest and nod their caps; dwarves sway beards and shoulder the pick
    if (kind === 'gnome') { assert.ok(peakRoll > .09); assert.ok(peakHat > .15); }
    if (kind === 'hobbit') assert.ok(peakRoll < .05 && maxBob > .03);
    if (kind === 'dwarf') {
      assert.ok(peakBeard > .1 && minBob < -.02);
      if (a.pick) assert.ok(peakPickY > .55, `${name} pick not hoisted`);
    }
    // stop: within 1.5 s everything is back exactly where it started
    for (let i = 0; i < 90; i++, t += dt) frame(a, t, dt, false);
    assert.equal(a.gait.w, 0);
    assert.equal(a.gait.carry, 0);
    for (const {p: part, pos, quat} of rest) {
      if (part === a.body) { assert.ok(Math.abs(part.position.y) <= .015); continue; }
      assert.ok(part.position.distanceTo(pos) < 1e-9, `${name} ${part.name || part.type} position`);
      assert.ok(Math.abs(part.quaternion.dot(quat)) > 1 - 1e-9, `${name} rotation`);
    }
    assert.ok(Math.abs(a.body.quaternion.dot(rest[0].quat)) > 1 - 1e-9);
  }
});

test('other creatures and GLB-swapped actors are left alone', () => {
  const jackal = createCreature({name: 'jackal'});
  assert.equal(updateGait(jackal, 1 / 60, true), null);
  const dwarf = createCreature({name: 'dwarf'});
  dwarf.asset = {};
  assert.equal(updateGait(dwarf, 1 / 60, true), null);
  assert.equal(dwarf.gait, undefined);
});

test('bats keep their flutter; ravens beat slower, unevenly, and glide', () => {
  assert.equal(flapStyle('giant bat'), null);
  assert.equal(flapStyle('vampire bat'), null);
  const style = flapStyle('raven');
  assert.equal(style.kind, 'raven');
  for (let t = 0; t < 3; t += .01) assert.equal(wingFlap(null, t), Math.sin(t * 14) * .65);

  const F = FLIGHT.raven, dt = 1 / 240;
  let prev = wingFlap(style, 0), maxStep = 0, glideMax = 0, lo = 0, hi = 0, down = 0, up = 0;
  for (let t = dt; t < 3 * F.cycle; t += dt) {
    const v = wingFlap(style, t);
    assert.ok(Number.isFinite(v) && Math.abs(v) <= F.amp + F.drift + 1e-9);
    const step = v - prev;
    maxStep = Math.max(maxStep, Math.abs(step));
    lo = Math.min(lo, v); hi = Math.max(hi, v);
    const u = ((t + style.phase) % F.cycle + F.cycle) % F.cycle;
    if (u > F.cycle - F.glide + F.ease && u < F.cycle) glideMax = Math.max(glideMax, Math.abs(v));
    if (beatWeight(t + style.phase) === 1) step < 0 ? down++ : up++;
    prev = v;
  }
  // smooth: no jumps between frames at 240 Hz, even across the glide boundaries
  assert.ok(maxStep < F.amp * F.rate * 2 * dt, `step ${maxStep}`);
  assert.ok(hi > .45 && lo < -.45, 'full strokes');
  // the glide holds the wings nearly still
  assert.ok(glideMax <= F.drift + 1e-9, `glide ${glideMax}`);
  // the stroke is uneven: one direction takes noticeably longer than the other
  assert.ok(Math.max(down, up) / Math.min(down, up) > 1.4, `${down} / ${up}`);
  // slower than the bat
  assert.ok(F.rate < FLIGHT.bat.rate / 2);
  // the beat weight is continuous and periodic
  for (let u = 0; u < F.cycle; u += .001) assert.ok(Math.abs(beatWeight(u + .001) - beatWeight(u)) < .01);
  assert.equal(beatWeight(0), beatWeight(F.cycle));
});
