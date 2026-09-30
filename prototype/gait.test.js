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

test('bee legs hang in flight, trail while flying on, and go slack to rest in death', async () => {
  const {DANGLE, dangles, dangleLayout, danglePose} = await import('./dangle.js');
  for (const name of ['killer bee', 'queen bee']) {
    const a = createCreature({name});
    assert.ok(dangles(a), name);
    // right legs front to back, then left: the layout reads that from the hips
    assert.deepEqual(dangleLayout(a.legs), {side: [1, 1, 1, -1, -1, -1], rank: [0, 1, 2, 0, 1, 2]});
    const pitch = () => a.legs.map(l => l.rotation.x), splay = () => a.legs.map(l => l.rotation.z);
    let t = 0, prev = null;
    const run = (secs, walking) => {
      for (let k = 0; k < secs * 60; k++, t += 1 / 60) {
        frame(a, t, 1 / 60, walking);
        const now = [...pitch(), ...splay()];
        for (const v of now) { assert.ok(Number.isFinite(v)); assert.ok(Math.abs(v) < .7, `${name} ${v}`); }
        // no snaps as flight starts, stops or the bee dies (the tremble alone moves ~.02 a frame)
        if (prev) now.forEach((v, i) => assert.ok(Math.abs(v - prev[i]) < .06, `${name} jump ${v - prev[i]}`));
        prev = now;
      }
    };
    run(1, false);
    // hovering: hind legs trail behind the front ones and every leg splays outward on its side
    const hover = pitch();
    assert.ok(hover[2] > hover[0] + .15 && hover[5] > hover[3] + .15, `${name} ${hover}`);
    splay().forEach((z, i) => assert.ok(z * (i < 3 ? 1 : -1) > 0, `${name} splay ${i}`));
    // the generic walker swing is replaced, not added to
    run(1, true);
    const fly = pitch();
    assert.ok(fly[2] > hover[2] + .2 && fly[5] > hover[5] + .2, `${name} trail ${fly}`);
    assert.ok(Math.abs(splay()[2]) < DANGLE.splay[2] * (1 - DANGLE.tuck) * 1.2, `${name} tuck`);
    run(1.5, false);
    const st = a.dangle, settled = danglePose(st.layout, st.t, 0, 1, st.seed);
    assert.equal(st.w, 0, `${name} settles back`);
    pitch().forEach((x, i) => assert.ok(Math.abs(x - settled.pitch[i]) < 1e-12, `${name} hover ${i}`));
    // death: the legs go slack to exactly their rest pose and stay there
    a.actions = {dead: true};
    run(1, false);
    assert.deepEqual([...pitch(), ...splay()], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = danglePose(dangleLayout(a.legs), 3.3, 1, 0);
    assert.deepEqual([...r.pitch, ...r.splay], Array(12).fill(0));
  }
  // nothing else dangles
  for (const name of ['giant ant', 'cave spider', 'bat', 'hobbit']) assert.ok(!dangles(createCreature({name})), name);
});
