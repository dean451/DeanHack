import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {engulfLook, chamberPoint, moteAt, engulfFrame, engulfCamera, dropEngulfCamera, createEngulf, engulfHeroPose, poseEngulfed,
  ENTER_MS, EXIT_MS, CHAMBER_R, CHAMBER_Y, INSIDE_DIST, MAX_MOTES} from './engulf.js';

const ENGULFERS = ['purple worm', 'trapper', 'lurker above', 'ochre jelly', 'Juiblex', 'air elemental', 'fog cloud',
  'dust vortex', 'ice vortex', 'energy vortex', 'steam vortex', 'fire vortex', null, 'newt'];
const frame = (x, z, engulfer) => ({player: {x, z, ...(engulfer !== undefined ? {engulfer} : {})}, cells: []});

test('every engulfer has a look, and unknown or unseen ones get the dark gullet', () => {
  assert.equal(engulfLook('purple worm').style, 'gullet');
  assert.equal(engulfLook('ochre jelly').style, 'ooze');
  assert.equal(engulfLook('fire vortex').style, 'wind');
  assert.deepEqual(engulfLook(null).wallRgb, engulfLook('newt').wallRgb);
  assert.equal(engulfLook(null).name, null);
  for (const n of ENGULFERS) {
    const l = engulfLook(n);
    for (const c of [...l.wallRgb, ...l.grooveRgb, ...l.moteRgb]) assert.ok(c >= 0 && c <= 1);
    assert.ok(l.opacity > 0 && l.opacity <= 1 && Number.isFinite(l.spin) && l.pulse > 0);
  }
});

test('chamber walls and motes stay finite, coloured and inside the chamber', () => {
  const dirs = [];
  for (let i = 0; i < 60; i++) {
    const y = 1 - 2 * (i + .5) / 60, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    dirs.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  for (const n of ENGULFERS) {
    const look = engulfLook(n);
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < 12; t += .37) for (const [x, y, z] of dirs) {
      const c = chamberPoint(look, x, y, z, t);
      assert.ok(Number.isFinite(c.scale));
      lo = Math.min(lo, c.scale); hi = Math.max(hi, c.scale);
      for (const v of c.rgb) assert.ok(v >= 0 && v <= 1, `${n} colour ${v}`);
    }
    // Motes stay inside the wall at its most squeezed and breathed-in (x .96).
    for (let t = 0; t < 12; t += .37) {
      let out = 0;
      for (let i = 0; i < MAX_MOTES; i++) {
        const m = moteAt(look, i, t);
        if (!m) continue;
        out++;
        assert.ok([m.x, m.y, m.z, m.alpha].every(Number.isFinite));
        assert.ok(m.alpha >= 0 && m.alpha <= 1);
        assert.ok(m.y >= 0 && Math.hypot(m.x, m.y - CHAMBER_Y, m.z) < CHAMBER_R * lo * .96, `${n} mote out of the chamber`);
      }
      assert.ok(out > 10);
    }
    assert.ok(lo > .8 && hi < 1.1, `${n} wall scale ${lo}..${hi}`);
  }
});

test('the chamber closes in, breathes, and bursts open back to nothing', () => {
  const e = {look: engulfLook('purple worm'), at: 1000};
  assert.equal(engulfFrame(e, 999), null);
  const start = engulfFrame(e, 1000);
  assert.equal(start.k, 0);
  assert.equal(start.camera.inside, 0);
  assert.ok(start.radius > CHAMBER_R * 2);
  let prev = -1;
  for (let t = 1000; t <= 1000 + ENTER_MS; t += 10) {
    const f = engulfFrame(e, t);
    assert.ok(f.k >= prev - 1e-9); prev = f.k;
  }
  let minR = Infinity, maxR = 0, maxFov = 0;
  for (let t = 1000 + ENTER_MS; t < 6000; t += 16) {
    const f = engulfFrame(e, t);
    assert.equal(f.k, 1);
    assert.ok([f.radius, f.opacity, f.camera.fovAdd].every(Number.isFinite));
    minR = Math.min(minR, f.radius); maxR = Math.max(maxR, f.radius); maxFov = Math.max(maxFov, f.camera.fovAdd);
  }
  assert.ok(minR > CHAMBER_R * .94 && maxR < CHAMBER_R * 1.06 && maxR - minR > .05);
  assert.ok(maxFov > 25 && maxFov < 40);
  e.outAt = 6000;
  const mid = engulfFrame(e, 6000 + EXIT_MS / 2);
  assert.ok(mid.k > 0 && mid.k < 1 && mid.radius > CHAMBER_R * 1.3);
  assert.equal(engulfFrame(e, 6000 + EXIT_MS), null);
  // Expelled before it has fully closed: it never jumps shut.
  const quick = {look: engulfLook('fog cloud'), at: 0, outAt: 200};
  const before = engulfFrame(quick, 200).k;
  for (let t = 200; t < 200 + EXIT_MS; t += 10) assert.ok(engulfFrame(quick, t).k <= before + 1e-9);
});

test('the camera goes inside and comes back out exactly', () => {
  const camera = new THREE.PerspectiveCamera(36, 1.5, .1, 100);
  const controls = {target: new THREE.Vector3(2, 0, 3), minDistance: 10};
  camera.position.set(11, 10.7, 16.1);
  const rest = camera.position.clone(), restDist = rest.distanceTo(controls.target);
  const e = {look: engulfLook('air elemental'), at: 0};
  let deepest = Infinity;
  for (let t = 0; t <= 2500; t += 16) {
    if (t >= 1800 && !e.outAt) e.outAt = t;
    const f = engulfFrame(e, t);
    // The follow code moves target and camera together each frame; that must survive.
    controls.target.x += .001; camera.position.x += .001; rest.x += .001;
    const d = engulfCamera(camera, controls, f?.camera);
    assert.ok([camera.position.x, camera.position.y, camera.position.z, camera.fov].every(Number.isFinite));
    if (f?.k === 1) {
      assert.ok(Math.abs(camera.position.distanceTo(controls.target) - INSIDE_DIST) < 1e-6);
      assert.ok(controls.minDistance < INSIDE_DIST && camera.fov > 36 + 20);
      deepest = Math.min(deepest, d);
    }
  }
  assert.ok(Math.abs(deepest - INSIDE_DIST) < 1e-6);
  assert.ok(camera.position.distanceTo(rest) < 1e-6);
  assert.ok(Math.abs(camera.position.distanceTo(controls.target) - restDist) < 1e-6);
  assert.ok(Math.abs(camera.fov - 36) < 1e-9);
  assert.equal(controls.minDistance, 10);
  assert.equal(camera.userData.engulfCam, null);
  // Dropping it mid-way restores the lens and the controls but leaves the position to the caller.
  engulfCamera(camera, controls, {inside: 1, fovAdd: 30});
  dropEngulfCamera(camera, controls);
  assert.ok(Math.abs(camera.fov - 36) < 1e-9);
  assert.equal(controls.minDistance, 10);
  assert.equal(camera.userData.engulfCam, null);
});

test('createEngulf follows the frame flag and clears up', () => {
  const group = new THREE.Group();
  const eg = createEngulf(THREE, group);
  const origin = {x: 4, z: 4};
  eg.frame(frame(6, 5));
  assert.equal(eg.update(.016, origin).engulfed, false);
  eg.frame(frame(6, 5, {name: 'ochre jelly'}));
  let r;
  for (let i = 0; i < 60; i++) r = eg.update(.016, origin);
  assert.ok(r.engulfed && r.inside === 1 && r.motes > 10);
  const chamber = group.children.find(o => o.userData.part === 'engulf-chamber');
  assert.ok(chamber.visible);
  assert.ok(Math.abs(chamber.position.x - 2) < 1e-9 && Math.abs(chamber.position.z - 1) < 1e-9);
  assert.ok(chamber.geometry.attributes.position.array.every(Number.isFinite));
  // Hallucination blanks the name mid-way: the look changes, the chamber stays shut.
  eg.frame(frame(6, 5, {name: null}));
  r = eg.update(.016, origin);
  assert.equal(r.inside, 1);
  assert.equal(eg.state.look.name, null);
  // Expelled: it opens and goes away.
  eg.frame(frame(7, 5));
  for (let i = 0; i < 40; i++) r = eg.update(.016, origin);
  assert.equal(r.engulfed, false);
  assert.equal(eg.state, null);
  assert.equal(chamber.visible, false);
  eg.frame(frame(6, 5, {name: 'purple worm'}));
  eg.update(.1, origin);
  eg.clear();
  assert.equal(eg.state, null);
  eg.dispose();
  assert.equal(group.children.length, 0);
});

test('the hero is yanked in, moves with the chamber, is thrown out and lands back at rest', () => {
  for (const n of ENGULFERS) {
    const e = {look: engulfLook(n), at: 1000, outAt: 1000 + ENTER_MS + 3000};
    assert.equal(engulfHeroPose(e, 999), null);
    let maxLift = 0, landed = false;
    for (let t = 1000; t <= e.outAt + EXIT_MS + 50; t += 7) {
      const p = engulfHeroPose(e, t);
      if (t >= e.outAt + EXIT_MS) { assert.equal(p, null, `${n} at ${t}`); continue; }
      for (const v of Object.values(p)) assert.ok(Number.isFinite(v), n);
      assert.ok(p.dy >= 0 && p.dy < .5, `${n} lift ${p.dy}`);
      assert.ok(Math.abs(p.pitch) < .8 && Math.abs(p.roll) < .3, `${n} tilt`);
      assert.ok(p.sx > .8 && p.sx < 1.2 && p.sy > .8 && p.sy < 1.2, `${n} squash ${p.sx} ${p.sy}`);
      if (t > e.outAt) maxLift = Math.max(maxLift, p.dy);
      if (t > e.outAt + EXIT_MS * .85 && p.sy < .9) landed = true;
    }
    assert.ok(maxLift > .3, `${n} is thrown out`);
    assert.ok(landed, `${n} lands with a squash`);
    // The swallow starts on the floor and pulls the hero up.
    const start = engulfHeroPose(e, 1000);
    assert.ok(Math.abs(start.dy) < 1e-9 && Math.abs(start.sy - 1) < 1e-9 && Math.abs(start.sx - 1) < 1e-9, n);
    assert.ok(engulfHeroPose(e, 1000 + ENTER_MS / 2).dy > .2, n);
  }
  // The throw starts where the chamber motion was: no jump on the frame of the escape.
  const e = {look: engulfLook('fire vortex'), at: 0, outAt: 2000};
  const a = engulfHeroPose(e, 1999.9), b = engulfHeroPose(e, 2000);
  for (const key of Object.keys(a)) assert.ok(Math.abs(a[key] - b[key]) < .01, key);
  // Wind tumbles and floats the hero more than a gullet does.
  const spread = name => { const w = {look: engulfLook(name), at: 0}; let r = 0; for (let t = ENTER_MS; t < 4000; t += 10) r = Math.max(r, Math.abs(engulfHeroPose(w, t).roll)); return r; };
  assert.ok(spread('air elemental') > spread('purple worm') + .1);
});

test('the engulf pose stacks on the model and comes off exactly', () => {
  const g = new THREE.Group();
  g.position.set(2, .1, -3); g.rotation.set(.05, 1.2, -.02); g.scale.set(1.1, .9, 1.1);
  const actor = {g}, before = [...g.position.toArray(), g.rotation.x, g.rotation.y, g.rotation.z, ...g.scale.toArray()];
  const e = {look: engulfLook('ochre jelly'), at: 0, outAt: 1500};
  for (let t = 0; t < 1500 + EXIT_MS + 30; t += 16) poseEngulfed(actor, engulfHeroPose(e, t));
  poseEngulfed(actor, {dy: .2, pitch: .3, roll: .1, sx: 1.1, sy: .9});
  poseEngulfed(actor, {dy: NaN, pitch: 0, roll: 0, sx: 1, sy: 1});
  assert.equal(actor.engulfPose, null);
  const after = [...g.position.toArray(), g.rotation.x, g.rotation.y, g.rotation.z, ...g.scale.toArray()];
  after.forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-9, `component ${i}`));
  poseEngulfed(null, {dy: 1, pitch: 0, roll: 0, sx: 1, sy: 1});
});

test('createEngulf hands the hero pose out only while the chamber is there', () => {
  const group = new THREE.Group(), en = createEngulf(THREE, group);
  assert.equal(en.update(.016, {x: 0, z: 0}).hero, null);
  en.frame(frame(4, 5, {name: 'purple worm'}));
  let r;
  for (let i = 0; i < 60; i++) r = en.update(.016, {x: 0, z: 0});
  assert.ok(r.hero && Number.isFinite(r.hero.sy));
  en.frame(frame(4, 5));
  for (let i = 0; i < 60; i++) r = en.update(.016, {x: 0, z: 0});
  assert.equal(r.hero, null);
  en.dispose();
});
