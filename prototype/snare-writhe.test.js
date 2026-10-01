import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import * as S from './snare-writhe.js';

const dt = 1 / 60;
const snare = () => createCreature({name: "Devil's Snare", symbol: 88, color: 2});
const mesh = a => a.body.children.find(c => c.userData.part === 'vines');
const arr = a => mesh(a).geometry.attributes.position.array;

// Mean offset from rest of the tip vertices (h > .8), and the worst offset at the root (y < .015).
function measure(a) {
  const st = a.snareWrithe, p = st.parts[0], cur = p.geo.attributes.position.array;
  let n = 0, x = 0, y = 0, z = 0, root = 0, max = 0, low = Infinity;
  for (let i = 0; i < p.w.length; i++) {
    const j = i * 3, dx = cur[j] - p.rest[j], dy = cur[j + 1] - p.rest[j + 1], dz = cur[j + 2] - p.rest[j + 2], d = Math.hypot(dx, dy, dz);
    for (const v of [cur[j], cur[j + 1], cur[j + 2]]) assert.ok(Number.isFinite(v));
    max = Math.max(max, d); low = Math.min(low, cur[j + 1]);
    if (p.rest[j + 1] < .015) root = Math.max(root, d);
    if (p.h[i] > .8) { n++; x += dx; y += dy; z += dz; }
  }
  return {x: x / n, y: y / n, z: z / n, root, max, low};
}

function frame(a, t, look) {
  if (a.actions) clearActionPose(a, a.actions);
  const busy = !!a.actions?.current || !!a.actions?.queue.length;
  S.updateSnareWrithe(a, dt, t, busy, look);
  if (a.actions) updateActions(a, a.actions, dt);
  return measure(a);
}

test("only Devil's Snare is moved, on its own copy of the geometry", () => {
  for (const name of ['lichen', 'xorn', 'beholder', 'shrieker']) assert.equal(S.updateSnareWrithe(createCreature({name}), dt, 0, false, null), null, name);
  const a = snare(), b = snare(), shared = mesh(a).geometry, before = Float32Array.from(shared.attributes.position.array);
  assert.equal(mesh(b).geometry, shared);
  for (let i = 0; i < 120; i++) frame(a, i * dt, null);
  assert.notEqual(mesh(a).geometry, shared);
  assert.equal(mesh(b).geometry, shared);
  assert.deepEqual(Array.from(shared.attributes.position.array), Array.from(before), 'shared geometry untouched');
  assert.equal(a.body.children.filter(c => c.isMesh).length, 2, 'still two draws');
});

test('alone, the vines writhe and now and then wring tight; the roots stay planted', () => {
  const a = snare(), tips = new Set();
  let squeezes = 0, was = false, worst = 0, rootWorst = 0, low = Infinity;
  for (let i = 0; i < 60 * 40; i++) {
    const m = frame(a, i * dt, null);
    worst = Math.max(worst, m.max); rootWorst = Math.max(rootWorst, m.root); low = Math.min(low, m.low);
    if (i % 30 === 0) tips.add(m.x.toFixed(4) + m.z.toFixed(4));
    const sq = !!a.snareWrithe.squeeze;
    if (sq && !was) squeezes++;
    was = sq;
  }
  assert.ok(worst > .02 && worst < .2, `writhe size ${worst}`);
  assert.ok(rootWorst < .002, `roots planted ${rootWorst}`);
  assert.ok(low >= 0, `nothing under the floor ${low}`);
  assert.ok(tips.size > 40, 'the tips keep moving');
  assert.ok(squeezes >= 3, `wrings ${squeezes}`);
});

test('with the hero near, the vines lean toward them and the tips beckon', () => {
  const a = snare(), look = {x: 2, z: 0};
  for (let i = 0; i < 60 * 3; i++) frame(a, i * dt, look);
  let sx = 0, lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 60 * 6; i++) { const m = frame(a, 3 + i * dt, look); sx += m.x; lo = Math.min(lo, m.x); hi = Math.max(hi, m.x); }
  assert.ok(sx / 360 > .04, `lean toward the hero ${sx / 360}`);
  assert.ok(hi - lo > .02, `beckoning ${hi - lo}`);
  const far = snare();
  for (let i = 0; i < 60 * 3; i++) frame(far, i * dt, {x: 9, z: 0});
  assert.ok(far.snareWrithe.near < .01, 'out of range');
});

test('an attack rears back then lashes forward; a blow recoils', () => {
  const a = snare();
  a.actions = createActionQueue();
  for (let i = 0; i < 60; i++) frame(a, i * dt, null);
  enqueueAction(a.actions, {kind: 'attack', attack: 'touch', result: 'hit', dir: [0, 1]});
  let back = 0, fwd = 0, tBack = -1, tFwd = -1;
  for (let i = 0; i < 60 * 2; i++) {
    const m = frame(a, 1 + i * dt, null);
    if (m.z < back) { back = m.z; tBack = i; }
    if (m.z > fwd) { fwd = m.z; tFwd = i; }
  }
  assert.ok(back < -.02 && fwd > .07 && tBack < tFwd, `rear ${back}@${tBack} lash ${fwd}@${tFwd}`);
  for (let i = 0; i < 120; i++) frame(a, 3 + i * dt, null);
  const before = measure(a);
  enqueueAction(a.actions, {kind: 'hit', attack: 'weapon', result: 'hit', dir: [0, -1]});
  let moved = 0;
  for (let i = 0; i < 30; i++) { const m = frame(a, 5 + i * dt, null); moved = Math.max(moved, Math.hypot(m.x - before.x, m.y - before.y, m.z - before.z)); }
  assert.ok(moved > .03, `recoil ${moved}`);
  assert.ok(a.snareWrithe.agit > .3);
});

test('death stills the writhe and slumps the vines down and out; stone holds', () => {
  const a = snare();
  a.actions = createActionQueue();
  for (let i = 0; i < 60 * 4; i++) {
    if (i % 50 === 0) enqueueAction(a.actions, {kind: i % 100 ? 'hit' : 'attack', attack: 'touch', result: 'hit', dir: [0, 1]});
    frame(a, i * dt, {x: 1, z: 2});
  }
  a.actions.dead = true;
  for (let i = 0; i < 60 * 4; i++) frame(a, 4 + i * dt, {x: 1, z: 2});
  const st = a.snareWrithe, m = measure(a);
  assert.ok(st.life < 1e-3 && st.A < 1e-4, 'still');
  assert.ok(m.y < -.1 && m.low >= 0, `slumped ${m.y}, above the floor ${m.low}`);
  const settled = Float32Array.from(arr(a));
  for (let i = 0; i < 60; i++) frame(a, 8 + i * dt, {x: -2, z: 1});
  assert.ok(Math.max(...arr(a).map((v, i) => Math.abs(v - settled[i]))) < 1e-3, 'stays slumped');

  const s = snare();
  for (let i = 0; i < 60 * 3; i++) frame(s, i * dt, {x: 1, z: 2});
  s.stone = true;
  const held = Float32Array.from(arr(s));
  for (let i = 0; i < 60 * 3; i++) frame(s, 3 + i * dt, {x: -3, z: 1});
  assert.ok(Math.max(...arr(s).map((v, i) => Math.abs(v - held[i]))) < 1e-12, 'stone holds');
});
