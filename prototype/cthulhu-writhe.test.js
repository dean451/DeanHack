import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {BEARD} from './cthulhu.js';
import {tailSway, FLAYER_SWING, FLAYER_SWING2} from './tail-sway.js';
import * as C from './cthulhu-writhe.js';

const dt = 1 / 60;
function cthulhu() { const a = createCreature({name: 'Cthulhu'}); a.species = 'cthulhu'; return a; }
const beard = a => a.tail.children.find(m => m.isMesh && m.userData.part === 'tentacles');
// live.js's generic wing flutter, written before fidget.js each frame
const flutter = (a, t) => a.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12); });
const tip = new THREE.Vector3();
const wingTip = w => { w.updateWorldMatrix(true, false); return tip.set(w.userData.side * .27, .15, -.2).applyMatrix4(w.matrix).clone(); };

test('only Cthulhu writhes, and it gets its own beard geometry, every vertex on a tentacle', () => {
  for (const name of ['mind flayer', 'beholder', 'medusa', 'bat']) {
    const a = createCreature({name}); a.species = name;
    assert.equal(C.updateCthulhuWrithe(a, dt, 0, false), null, name);
  }
  const a = cthulhu(), b = cthulhu(), shared = beard(a).geometry;
  assert.equal(shared, beard(b).geometry);
  const st = C.updateCthulhuWrithe(a, dt, 0, false);
  assert.notEqual(beard(a).geometry, shared, 'cloned');
  assert.equal(beard(b).geometry, shared);
  const {verts} = st.beard;
  assert.equal(verts.length, shared.attributes.position.count);
  for (let k = 0; k < BEARD; k++) {
    const v = verts.filter(q => q.k === k);
    assert.ok(v.length > 1000, `tentacle ${k}: ${v.length}`);
    assert.ok(v.some(q => q.h < .02) && v.some(q => q.h > .98), `tentacle ${k} root to tip`);
  }
  // tentacles are numbered left to right across the maw
  const mean = k => { const v = verts.filter(q => q.k === k && q.h > .5); return v.reduce((s, q) => s + shared.attributes.position.getX(q.i), 0) / v.length; };
  for (let k = 1; k < BEARD; k++) assert.ok(mean(k) > mean(k - 1), `order ${k}`);
});

test('the beard drifts slowly on the tail, like a flayer\'s', () => {
  const a = cthulhu();
  let m = 0;
  for (let t = 0; t < 20; t += .05) m = Math.max(m, Math.abs(tailSway(a, t)));
  assert.ok(m <= FLAYER_SWING + FLAYER_SWING2 + 1e-9);
});

test('the beard writhes and reaches, the wings twitch, spread and flare, and in death all hangs limp and still', () => {
  const a = cthulhu(), rest = Float32Array.from(beard(a).geometry.attributes.position.array);
  // the rest fold, as live.js leaves it without the flutter
  const restTips = a.wings.map(w => { w.rotation.set(0, -w.userData.side * C.FOLD, 0); return wingTip(w); });
  let t = 0;
  const run = (secs, look, each) => { for (let i = 0; i < secs * 60; i++) { t += dt; flutter(a, t); C.updateCthulhuWrithe(a, dt, t, !!a.actions, look); each?.(); } };
  const move = () => {
    const p = beard(a).geometry.attributes.position.array; let m = 0, fwd = 0, down = 0;
    assert.ok(p.every(Number.isFinite));
    for (let i = 0; i < p.length; i += 3) {
      m = Math.max(m, Math.hypot(p[i] - rest[i], p[i + 1] - rest[i + 1], p[i + 2] - rest[i + 2]));
      fwd = Math.max(fwd, p[i + 2] - rest[i + 2]); down = Math.min(down, p[i + 1] - rest[i + 1]);
    }
    return {m, fwd, down};
  };
  const rooted = () => {
    const p = beard(a).geometry.attributes.position.array; let m = 0;
    a.cthulhuWrithe.beard.verts.forEach((q, j) => { if (q.h < .06) { const i = j * 3; m = Math.max(m, Math.hypot(p[i] - rest[i], p[i + 1] - rest[i + 1], p[i + 2] - rest[i + 2])); } });
    return m;
  };
  const wings = () => a.wings.map(w => { assert.ok(Number.isFinite(w.rotation.y) && Number.isFinite(w.rotation.z)); return {y: w.rotation.y * w.userData.side, z: w.rotation.z * w.userData.side}; });
  let alone = 0, root = 0, wingMax = 0, wingMin = 0;
  run(10, null, () => {
    alone = Math.max(alone, move().m); root = Math.max(root, rooted());
    for (const w of wings()) { wingMax = Math.max(wingMax, w.z); wingMin = Math.min(wingMin, w.z); }
  });
  assert.ok(alone > .01 && alone < .06, `alone ${alone}`);
  assert.ok(root < .003, `roots ${root}`);
  // the wings are not on the generic flutter any more, and they've twitched up at least once
  assert.ok(wingMax > .15 && wingMax < .9, `twitch lift ${wingMax}`);
  assert.ok(wingMin > -.15, `idle wings never sag ${wingMin}`);
  // the hero near: the tips reach out toward them, the wings spread and lift
  const look = new THREE.Vector3(.4, 0, 2.5);
  let near = 0, reach = 0;
  run(8, look, () => { const m = move(); near = Math.max(near, m.m); reach = Math.max(reach, m.fwd); });
  assert.ok(near > alone && near < .16, `near ${near}`);
  assert.ok(reach > C.REACH.fwd * .8, `reach ${reach}`);
  const spread = a.wings.map(wingTip);
  spread.forEach((p, i) => assert.ok(p.z < restTips[i].z - .02, `wing ${i} swings back`));
  // an attack: the tentacles lash forward and the wings flare wide
  a.actions = {current: {kind: 'attack', attack: 'tentacle'}, queue: [], age: 1, u: 0};
  let lash = 0, flare = 0;
  run(.5, look, () => { a.actions.u = Math.min(1, a.actions.u + dt / .5); lash = Math.max(lash, move().fwd); flare = Math.max(flare, ...wings().map(w => w.z)); });
  assert.ok(lash > C.LASH.fwd * .6 && lash < .2, `lash ${lash}`);
  assert.ok(flare > C.FLARE.lift * .6 && flare < 1.2, `flare ${flare}`);
  a.actions = {current: {kind: 'hit', attack: 'weapon'}, queue: [], age: 1, u: .5};
  run(.3, look); assert.ok(a.cthulhuWrithe.agit > .4);
  assert.ok(move().m < .2);
  // death: the writhe stops, the tentacles hang back and down, the wings sag shut and all holds still
  a.actions = {current: null, queue: [], dead: true};
  run(6, look);
  const end = move();
  assert.ok(end.down < -C.LIMP.down * .5, `limp ${end.down}`);
  for (const w of wings()) assert.ok(Math.abs(w.z - C.SAG.lift) < .01, `sag ${w.z}`);
  const still = Float32Array.from(beard(a).geometry.attributes.position.array), wingsStill = wings();
  run(1, look);
  const after = beard(a).geometry.attributes.position.array;
  for (let i = 0; i < after.length; i++) assert.ok(Math.abs(after[i] - still[i]) < 1e-5, 'holds still');
  assert.deepEqual(wings().map(w => w.z.toFixed(5)), wingsStill.map(w => w.z.toFixed(5)));
});

test('undisturbed, the tips and wings spring back to rest; stone holds the pose', () => {
  const a = cthulhu();
  const st = C.updateCthulhuWrithe(a, dt, 0, false);
  st.tips.forEach(tp => tp.v.set(.3, .2, -.3));
  st.wings.forEach(wg => { wg.v = 3; });
  st.wait = st.flick = 1e9;
  for (let i = 0; i < 180; i++) C.updateCthulhuWrithe(a, dt, i * dt, false);
  for (const tp of st.tips) assert.ok(tp.s.length() < 1e-3, `tip ${tp.s.length()}`);
  for (const wg of st.wings) assert.ok(Math.abs(wg.s) < 1e-3, `wing ${wg.s}`);
  // turned to stone: nothing moves on
  a.stone = {k: 1};
  const P = st.P, before = Float32Array.from(beard(a).geometry.attributes.position.array);
  for (let i = 0; i < 30; i++) C.updateCthulhuWrithe(a, dt, 3 + i * dt, false);
  assert.equal(st.P, P);
  assert.deepEqual(Array.from(beard(a).geometry.attributes.position.array), Array.from(before));
});
