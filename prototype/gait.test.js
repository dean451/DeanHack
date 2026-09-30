import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {GAITS, gaitKind, gaitPose, updateGait, FLIGHT, flapStyle, beatWeight, wingFlap, glideSink, flightBob} from './gait.js';

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

test('bats keep their hover bob; ravens sink through the glide and climb back', () => {
  for (let t = 0; t < 3; t += .01) assert.equal(flightBob(null, t, .7), Math.sin(t * 2.2 + .7) * .06);
  const F = FLIGHT.raven, style = {kind: 'raven', phase: 1.3}, dt = 1 / 240, beat = F.cycle - F.glide;
  const bound = F.hover + F.lift + F.sink;
  let prev = flightBob(style, 0), maxStep = 0, lo = Infinity, hi = -Infinity;
  for (let t = dt; t < 3 * F.cycle; t += dt) {
    const v = flightBob(style, t);
    assert.ok(Number.isFinite(v) && Math.abs(v) <= bound + 1e-9, `${v}`);
    maxStep = Math.max(maxStep, Math.abs(v - prev));
    lo = Math.min(lo, v); hi = Math.max(hi, v);
    prev = v;
  }
  // smooth at 240 Hz, including where the glide starts and ends
  assert.ok(maxStep < .004, `step ${maxStep}`);
  assert.ok(hi - lo > F.sink, `range ${hi - lo}`);
  // the sink: level at the end of the climb, lowest as the glide ends, continuous and periodic
  assert.ok(Math.abs(glideSink(beat)) < 1e-12);
  assert.ok(Math.abs(glideSink(F.cycle - 1e-9) + F.sink) < 1e-6);
  assert.ok(Math.abs(glideSink(0) - glideSink(F.cycle)) < 1e-12);
  let prevSink = glideSink(beat);
  for (let u = beat + .01; u < F.cycle; u += .01) { const s = glideSink(u); assert.ok(s <= prevSink + 1e-12, 'always sinking in the glide'); prevSink = s; }
  for (let u = 0; u < F.cycle; u += .001) assert.ok(Math.abs(glideSink(u + .001) - glideSink(u)) < .001);
  // while gliding the wingbeat lift is gone, so the body only drifts down (plus the slow hover)
  for (let u = beat + F.ease; u < F.cycle; u += .05) {
    const t = u - style.phase;
    assert.ok(Math.abs(flightBob(style, t) - (Math.sin(u * 1.1) * F.hover + glideSink(u))) < 1e-9);
  }
});

test('the couatl beats its raised wings slowly about z and hangs with them held up', async () => {
  const style = flapStyle('couatl');
  assert.equal(style.kind, 'couatl');
  assert.equal(flapStyle('raven').kind, 'raven');
  const F = FLIGHT.couatl, R = FLIGHT.raven, dt = 1 / 240, beat = F.cycle - F.glide;
  assert.ok(F.rate < R.rate && F.amp < R.amp, 'lazier than a raven');
  assert.equal(R.hold, 0);
  let prevW = wingFlap(style, 0), prevB = flightBob(style, 0), stepW = 0, stepB = 0, lo = 0, hi = 0;
  for (let t = dt; t < 3 * F.cycle; t += dt) {
    const w = wingFlap(style, t), b = flightBob(style, t);
    assert.ok(Number.isFinite(w) && Math.abs(w) <= F.amp + F.hold + F.drift + 1e-9, `${w}`);
    assert.ok(Number.isFinite(b) && Math.abs(b) <= F.hover + F.lift + F.sink + 1e-9, `${b}`);
    stepW = Math.max(stepW, Math.abs(w - prevW)); stepB = Math.max(stepB, Math.abs(b - prevB));
    lo = Math.min(lo, w); hi = Math.max(hi, w);
    const u = ((t + style.phase) % F.cycle + F.cycle) % F.cycle;
    // the hang: wings held up in their V, only drifting
    if (u > beat + F.ease) assert.ok(Math.abs(w - F.hold) <= F.drift + 1e-9, `hang ${w}`);
    prevW = w; prevB = b;
  }
  assert.ok(stepW < F.amp * F.rate * 2 * dt, `wing step ${stepW}`);
  assert.ok(stepB < .004, `bob step ${stepB}`);
  assert.ok(hi > .27 && lo < -.27, 'full strokes');
  for (let u = 0; u < F.cycle; u += .001) assert.ok(Math.abs(beatWeight(u + .001, F) - beatWeight(u, F)) < .01);

  // a real couatl driven like live.js: wings turn about z only, and mirror each other
  const {createCouatl} = await import('./couatl.js');
  const c = createCouatl();
  assert.equal(c.quirk, 'hover');
  assert.equal(c.wings.length, 2);
  for (let t = 0; t < 10; t += 1 / 60) {
    c.wings.forEach((wing, i) => { wing.rotation.z = (wing.userData.side || (i ? 1 : -1)) * wingFlap(style, t); });
    c.body.position.y = flightBob(style, t, 0);
    const [a, b] = c.wings;
    assert.ok(Math.abs(a.rotation.z + b.rotation.z) < 1e-12, 'mirrored');
    assert.equal(a.rotation.y, 0);
    assert.ok(Math.abs(c.body.position.y) < .09);
  }
});

test('ghost sleeves drift, trail while moving, go limp in death and settle to rest', async () => {
  const {SLEEVES, sleevePose, hasSleeves, updateSleeves} = await import('./sleeves.js');
  const r = sleevePose(3.1, 0, 0, 0, {...SLEEVES, pitch: 0, sway: 0, head: 0});
  assert.deepEqual([...r.arms.flat(), ...r.head].map(v => Math.abs(v)), [0, 0, 0, 0, 0, 0]);
  for (const name of ['ghost', 'shade']) {
    const a = createCreature({name, kind: 'monster'});
    assert.ok(hasSleeves(a), name);
    const parts = [...a.arms, a.head];
    const rest = parts.map(p => p.quaternion.clone());
    const angle = () => Math.max(...parts.map((p, i) => p.quaternion.angleTo(rest[i])));
    let peak = 0, spread = 0, t = 0;
    const step = (secs, walking) => { for (let i = 0; i < secs * 60; i++, t += 1 / 60) {
      a.body.position.y = 0;
      assert.equal(updateGait(a, 1 / 60, walking), null);
      const p = a.sleeves && sleevePose(a.sleeves.t, a.sleeves.w, a.sleeves.d, a.sleeves.seed);
      for (const part of parts) for (const v of part.quaternion.toArray()) assert.ok(Number.isFinite(v));
      peak = Math.max(peak, angle());
      if (p) spread = Math.max(spread, Math.abs(p.arms[0][0] - p.arms[1][0]));
    } };
    step(12, false);
    assert.ok(peak > .08 && peak < .3, `${name} idle drift ${peak}`);
    assert.ok(spread > .1, `${name} sleeves out of step ${spread}`);
    step(2, true);
    assert.ok(a.sleeves.w > .99);
    const trailing = sleevePose(a.sleeves.t, 1, 0, a.sleeves.seed);
    assert.ok(trailing.arms.every(([x]) => x > SLEEVES.trail - SLEEVES.pitch), 'sleeves trail back');
    step(3, false);
    assert.ok(a.sleeves.w < 1e-4);
    // with the drift switched off, the sleeves come back to exactly the rest pose
    const saved = {...SLEEVES};
    Object.assign(SLEEVES, {pitch: 0, sway: 0, head: 0});
    step(.1, false);
    assert.ok(angle() < 1e-3, `${name} rest ${angle()}`);
    a.actions = {dead: true};
    step(3, false);
    Object.assign(SLEEVES, saved);
    assert.ok(Math.abs(a.arms[0].quaternion.angleTo(rest[0]) - SLEEVES.limp) < .02, 'limp in death');
    assert.ok(peak < 1.2);
  }
  // other hoverers and walkers are left alone
  for (const name of ['floating eye', 'couatl', 'kobold zombie']) {
    const a = createCreature({name, kind: 'monster'});
    assert.ok(!hasSleeves(a), name);
    assert.equal(updateSleeves(a, .1, false), null);
    assert.equal(a.sleeves, undefined);
  }
});

test('jabberwocks stalk on slow opposed strides, balance with the tail and settle exactly to rest', async () => {
  const {STRIDE, strides, stridePose, updateStride, clearStride} = await import('./stride.js');
  for (const name of ['jabberwock', 'vorpal jabberwock']) {
    const a = createCreature({name, symbol: 'J'});
    assert.ok(strides(a), name);
    const rest = {bx: a.body.rotation.x, bz: a.body.rotation.z, ty: a.tail.rotation.y, tx: a.tail.rotation.x};
    // live.js's frame: generic leg swing, body bob and tail roll, then the gait (and an action
    // layer offset on the tail that comes off again the next frame)
    let t = 0, prev = null, maxStep = 0, legMax = 0, yawMin = 0, yawMax = 0, opposed = true;
    const step = (dt, walking) => {
      t += dt;
      a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
      a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .035;
      a.tail.rotation.z = Math.sin(t * 3) * .24;
      a.tail.rotation.x -= .05 * Math.sin(t - dt);
      updateGait(a, dt, walking);
      a.tail.rotation.x += .05 * Math.sin(t);
      const v = [...a.legs.map(l => l.rotation.x), a.body.position.y, a.body.rotation.x, a.body.rotation.z, a.tail.rotation.y, a.tail.rotation.x];
      for (const x of v) assert.ok(Number.isFinite(x));
      if (prev) maxStep = Math.max(maxStep, ...v.map((x, i) => i === 2 ? 0 : Math.abs(x - prev[i])));
      prev = v;
      legMax = Math.max(legMax, ...a.legs.map(l => Math.abs(l.rotation.x)));
      if (Math.abs(a.legs[0].rotation.x + a.legs[1].rotation.x) > 1e-9) opposed = false;
      if (walking) { yawMin = Math.min(yawMin, a.tail.rotation.y - rest.ty); yawMax = Math.max(yawMax, a.tail.rotation.y - rest.ty); }
      assert.ok(Math.abs(a.body.rotation.x - rest.bx) <= STRIDE.lean + 1e-9);
      assert.ok(Math.abs(a.body.rotation.z - rest.bz) <= STRIDE.roll + 1e-9);
      assert.ok(Math.abs(a.body.position.y) < .06);
    };
    for (let i = 0; i < 120; i++) step(1 / 60, false);
    for (let i = 0; i < 240; i++) step(1 / 60, true);
    for (let i = 0; i < 120; i++) step(1 / 60, false);
    assert.ok(opposed, `${name}: legs a half cycle apart`);
    assert.ok(legMax <= STRIDE.thigh + 1e-9 && legMax > .3, `${name}: stride ${legMax}`);
    assert.ok(maxStep < .06, `${name}: step ${maxStep}`);
    assert.ok(yawMin < -.15 && yawMax > .15, `${name}: tail sway ${yawMin}..${yawMax}`);
    // standing: legs back at 0, the lean gone, only the slow lash left on the tail
    a.legs.forEach(l => assert.ok(l.rotation.x === 0));
    assert.ok(Math.abs(a.body.rotation.x - rest.bx) < 1e-12 && Math.abs(a.body.rotation.z - rest.bz) < 1e-12);
    assert.ok(Math.abs(a.tail.rotation.y - rest.ty) <= STRIDE.lash + 1e-9);
    // death: the tail goes slack to its exact rest pose
    a.actions = {dead: true};
    for (let i = 0; i < 120; i++) step(1 / 60, false);
    a.tail.rotation.x -= .05 * Math.sin(t);
    assert.ok(Math.abs(a.tail.rotation.y - rest.ty) < 1e-12 && Math.abs(a.tail.rotation.x - rest.tx) < 1e-12, name);
    clearStride(a);
    assert.ok(Math.abs(a.tail.rotation.y - rest.ty) < 1e-12);
  }
  // the pose itself is at rest with no walk and no life
  const p = stridePose(1.3, 0, 0, 5);
  for (const v of [...p.legs, p.bob, p.roll, p.lean, p.tailYaw, p.tailLift]) assert.equal(Math.abs(v), 0);
  // nothing else strides
  for (const name of ['jackal', 'hill giant', 'red dragon']) assert.equal(updateStride(createCreature({name}), 1 / 60, true), null);
});

test('walking jabberwocks fold their wings back along the flanks and spread them again at rest', async () => {
  const {STRIDE, stridePose, clearStride} = await import('./stride.js');
  const a = createCreature({name: 'jabberwock', symbol: 'J'});
  assert.equal(a.wings.length, 2);
  const restX = a.wings.map(w => w.rotation.x);
  let t = 0, prev = null, maxStep = 0, foldMin = Infinity, droopMax = 0;
  const step = (dt, walking) => {
    t += dt;
    // live.js's dragon wing flutter (absolute) and an action-layer flare on z
    a.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12); w.rotation.z = 0; });
    a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
    updateGait(a, dt, walking);
    const v = a.wings.flatMap(w => [w.rotation.x, w.rotation.y]);
    for (const x of v) assert.ok(Number.isFinite(x));
    if (prev) maxStep = Math.max(maxStep, ...v.map((x, i) => Math.abs(x - prev[i])));
    prev = v;
    // mirrored: both wings sweep the same way about their own side
    assert.ok(Math.abs(a.wings[0].rotation.y + a.wings[1].rotation.y) < 1e-9);
    a.wings.forEach((w, i) => {
      assert.ok(w.rotation.x - restX[i] <= 1e-12 && w.rotation.x - restX[i] >= -(STRIDE.droop + STRIDE.jolt) - 1e-9);
      assert.ok(Math.abs(w.rotation.y) <= STRIDE.fold + 1e-9);
    });
    if (walking && t > 2.4) {
      foldMin = Math.min(foldMin, a.wings[1].rotation.y);
      droopMax = Math.max(droopMax, restX[1] - a.wings[1].rotation.x);
    }
  };
  for (let i = 0; i < 60; i++) step(1 / 60, false);
  assert.ok(a.wings[1].rotation.y < 0, 'standing: half spread, forward');
  for (let i = 0; i < 180; i++) step(1 / 60, true);
  assert.ok(foldMin > STRIDE.fold - .01, `folded ${foldMin}`);
  assert.ok(droopMax > STRIDE.droop, `droop ${droopMax}`);
  for (let i = 0; i < 120; i++) step(1 / 60, false);
  assert.ok(maxStep < .15, `step ${maxStep}`);
  // back at rest: live.js's flutter owns the sweep again and the droop is gone exactly
  a.wings.forEach((w, i) => {
    assert.ok(Math.abs(w.rotation.x - restX[i]) < 1e-12);
    assert.ok(Math.abs(w.rotation.y - (i ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12)) < 1e-12);
  });
  clearStride(a);
  a.wings.forEach((w, i) => assert.ok(Math.abs(w.rotation.x - restX[i]) < 1e-12));
  const p = stridePose(2, 0, 1, 3);
  assert.equal(Math.abs(p.fold) + Math.abs(p.droop), 0);
});
