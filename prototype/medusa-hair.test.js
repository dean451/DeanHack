import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateMedusaCoil} from './medusa-coil.js';
import {SNAKES} from './medusa.js';
import * as H from './medusa-hair.js';

const dt = 1 / 60;
function medusa() { const a = createCreature({name: 'medusa'}); a.species = 'medusa'; return a; }
const part = (a, name) => a.head.children.find(m => m.isMesh && m.userData.part === name);

test('only Medusa writhes, and she gets her own head and eye geometry', () => {
  for (const name of ['snake', 'cobra', 'guardian naga', 'beholder']) {
    const a = createCreature({name}); a.species = name;
    assert.equal(H.updateMedusaHair(a, dt, 0, false), null, name);
  }
  const a = medusa(), b = medusa(), shared = part(a, 'head').geometry, sharedEyes = part(a, 'eyes').geometry;
  assert.equal(shared, part(b, 'head').geometry);
  const st = H.updateMedusaHair(a, dt, 0, false);
  assert.notEqual(part(a, 'head').geometry, shared, 'cloned');
  assert.notEqual(part(a, 'eyes').geometry, sharedEyes, 'eyes cloned');
  assert.equal(part(b, 'head').geometry, shared);
  // every snake has its body, its head, a tongue and two eyes; her face isn't touched
  const [head, eyes] = st.parts;
  for (let k = 0; k < SNAKES; k++) {
    const v = head.verts.filter(q => q.k === k);
    assert.ok(v.filter(q => q.h < 1).length > 200, `snake ${k} body`);
    assert.ok(v.some(q => q.tongue && q.h === 1), `snake ${k} tongue`);
    assert.ok(v.some(q => !q.tongue && q.h === 1), `snake ${k} head`);
    assert.equal(eyes.verts.filter(q => q.k === k).length, eyes.verts.length / SNAKES, `snake ${k} eyes`);
  }
  const pos = shared.attributes.position;
  for (const q of head.verts) assert.ok(!(pos.getZ(q.i) > .05 && pos.getY(q.i) < .13 && Math.hypot(pos.getX(q.i), pos.getY(q.i) - .1, pos.getZ(q.i)) < .1), 'face clear');
  assert.ok(eyes.verts.length < eyes.geo.attributes.position.count, 'her own eyes stay put');
});

test('helpers stay in bounds', () => {
  const w = [0, 0];
  for (let h = 0; h <= 1.0001; h += .05) for (let P = 0; P < 7; P += .7) {
    H.wave(3, h, P, 1, w);
    assert.ok(Math.abs(w[0]) <= 1 && Math.abs(w[1]) <= .55 + 1e-9);
  }
  for (let u = 0; u <= 1.0001; u += .01) { const f = H.flicker(u); assert.ok(f >= 0 && f <= 1); }
  assert.equal(H.flicker(0), 0); assert.equal(H.flicker(1), 0);
});

test('the snakes writhe, strike at the hero, lunge on a bite, and droop and hold still in death', () => {
  const a = medusa();
  const rest = Float32Array.from(part(a, 'head').geometry.attributes.position.array);
  let t = 0;
  const run = (secs, look, each) => { for (let i = 0; i < secs * 60; i++) { t += dt; updateMedusaCoil(a, dt, t, !!a.actions, look); H.updateMedusaHair(a, dt, t, !!a.actions, look); each?.(); } };
  const move = () => {
    const p = part(a, 'head').geometry.attributes.position.array; let m = 0, fwd = 0, down = 0;
    assert.ok(p.every(Number.isFinite));
    for (let i = 0; i < p.length; i += 3) {
      m = Math.max(m, Math.hypot(p[i] - rest[i], p[i + 1] - rest[i + 1], p[i + 2] - rest[i + 2]));
      fwd = Math.max(fwd, p[i + 2] - rest[i + 2]); down = Math.min(down, p[i + 1] - rest[i + 1]);
    }
    return {m, fwd, down};
  };
  // roots stay planted: anything near the skull barely moves
  const rooted = () => {
    const p = part(a, 'head').geometry.attributes.position.array; let m = 0;
    for (const q of a.medusaHair.parts[0].verts) if (q.h < .08) { const i = q.i * 3; m = Math.max(m, Math.hypot(p[i] - rest[i], p[i + 1] - rest[i + 1], p[i + 2] - rest[i + 2])); }
    return m;
  };
  let alone = 0, root = 0;
  run(8, null, () => { alone = Math.max(alone, move().m); root = Math.max(root, rooted()); });
  assert.ok(alone > .006 && alone < .05, `alone ${alone}`);
  assert.ok(root < .003, `roots ${root}`);
  const look = new THREE.Vector3(.5, 0, 2.5);
  let near = 0;
  run(8, look, () => { near = Math.max(near, move().m); });
  assert.ok(near > alone && near < .09, `near ${near}`);
  // a bite: the whole nest lunges forward
  a.actions = {current: {kind: 'attack', attack: 'bite'}, queue: [], age: 1, u: 0};
  let lunge = 0;
  run(.45, look, () => { a.actions.u = Math.min(1, a.actions.u + dt / .45); lunge = Math.max(lunge, move().fwd); });
  assert.ok(lunge > H.LUNGE * .6 && lunge < .1, `lunge ${lunge}`);
  a.actions = {current: {kind: 'attack', attack: 'gaze'}, queue: [], age: 1, u: 0};
  run(.42, look, () => { a.actions.u = Math.min(1, a.actions.u + dt / .42); });
  a.actions = {current: {kind: 'hit', attack: 'weapon'}, queue: [], age: 1, u: .5};
  run(.3, look); assert.ok(a.medusaHair.agit > .4);
  assert.ok(move().m < .12);
  // death: the writhe stops, the snakes droop and hold still
  a.actions = {current: null, queue: [], dead: true};
  run(6, look);
  const end = move();
  assert.ok(end.down < -H.DROOP.down * .8 && end.down >= -H.DROOP.down - 1e-3, `droop ${end.down}`);
  const still = Float32Array.from(part(a, 'head').geometry.attributes.position.array);
  run(1, look);
  const after = part(a, 'head').geometry.attributes.position.array;
  for (let i = 0; i < after.length; i++) assert.ok(Math.abs(after[i] - still[i]) < 1e-5, 'holds still');
});

test('undisturbed, the snakes spring back to rest', () => {
  const a = medusa();
  const st = H.updateMedusaHair(a, dt, 0, false);
  st.snakes.forEach(sn => sn.v.set(.3, .2, -.3));
  st.twitch = 1e9;
  for (let i = 0; i < 180; i++) H.updateMedusaHair(a, dt, i * dt, false);
  for (const sn of st.snakes) assert.ok(sn.s.length() < 1e-3, `spring ${sn.s.length()}`);
});
