import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline, FX_TICK_MS} from './fx.js';
import {MARK_LOOKS, MARK_Y, FLASH_MS, rayMarks, markFrame, rayFlash, createRayMarks} from './ray-marks.js';

const zap = (type, dir = 'horizontal') => ({kind: 'zap', zap: type, dir});
// A bolt going east from x=3, bouncing off a wall past x=6 and coming back to x=4.
const bolt = type => fxTimeline({steps: [
  {op: 'start', mode: 'beam', glyph: 1, effect: zap(type)},
  ...[3, 4, 5, 6, 6, 5, 4].flatMap(x => [{op: 'draw', x, z: 2}, {op: 'tick'}]),
  {op: 'end'},
]});
const longest = type => Math.max(...MARK_LOOKS[type].map(L => L.ms));

test('every mark look is finite and bounded', () => {
  for (const [type, parts] of Object.entries(MARK_LOOKS)) {
    for (const L of parts) {
      assert.ok([0, 1, 2].includes(L.shape), type);
      assert.ok(L.alpha > 0 && L.alpha <= 1, `${type} alpha`);
      assert.ok(L.size > 0 && L.size <= .8, `${type} size`);
      assert.ok(L.fadeMs > 0 && L.fadeMs <= L.ms && L.grow > 0, `${type} timing`);
    }
  }
});

test('a bouncing bolt marks each cell once, when the beam first got there', () => {
  const m = rayMarks(bolt('fire'));
  assert.deepEqual(m.map(k => k.x), [3, 4, 5, 6]);
  assert.deepEqual(m.map(k => k.t), [0, 1, 2, 3].map(i => i * FX_TICK_MS));
  for (const k of m) { assert.equal(k.z, 2); assert.ok(k.seed >= 0 && k.seed < 1); }
  // Magic missile and sleep leave nothing; nor do thrown objects.
  assert.equal(rayMarks(bolt('magic missile')).length, 0);
  assert.equal(rayMarks(bolt('sleep')).length, 0);
  assert.equal(rayMarks(fxTimeline({steps: [{op: 'start', mode: 'flash', glyph: 1, effect: {kind: 'object', otyp: 3}},
    {op: 'draw', x: 1, z: 1}, {op: 'tick'}, {op: 'end'}]})).length, 0);
  assert.equal(rayMarks(null).length, 0);
});

test('marks grow in, stay finite, and are gone by the end of their look', () => {
  for (const type of Object.keys(MARK_LOOKS)) {
    const marks = rayMarks(bolt(type));
    assert.ok(marks.length, type);
    const end = marks.at(-1).t + longest(type);
    let peak = 0;
    for (let t = 0; t <= end; t += 20) {
      for (const p of markFrame(marks, t)) {
        for (const k of ['x', 'z', 'alpha', 'size', 'rot']) assert.ok(Number.isFinite(p[k]), `${type}.${k} at ${t}`);
        assert.ok(p.alpha >= 0 && p.alpha <= 1, `${type} alpha ${p.alpha}`);
        assert.ok(p.size > 0 && p.size < .95, `${type} size ${p.size}`);
        assert.ok(Math.abs(p.z - 2) < 1e-9 && p.x >= 3 && p.x <= 6);
        peak = Math.max(peak, p.alpha);
      }
    }
    assert.ok(peak > .4, `${type} peak ${peak}`);
    assert.equal(markFrame(marks, end).length, 0, `${type} gone`);
    // Nothing shows before the beam arrives.
    assert.equal(markFrame(marks, -1).length, 0);
  }
  // A scorch outlasts its embers, and a death ripple spreads.
  const fire = rayMarks(bolt('fire'));
  const late = markFrame(fire.slice(0, 1), 3000);
  assert.equal(late.length, 1); assert.equal(late[0].add, false);
  const death = rayMarks(bolt('death')).slice(0, 1);
  const r0 = markFrame(death, 50).find(p => !p.add).size, r1 = markFrame(death, 500).find(p => !p.add).size;
  assert.ok(r1 > r0 * 2, `ripple ${r0} → ${r1}`);
});

test('lightning flashes and then goes dark; other rays do not flash', () => {
  const tl = bolt('lightning');
  assert.equal(rayFlash(tl, 0), 0);
  let peak = 0;
  for (let t = 0; t < 100; t += 5) peak = Math.max(peak, rayFlash(tl, t));
  assert.ok(peak > .8, `peak ${peak}`);
  assert.equal(rayFlash(tl, tl.duration + FLASH_MS + 25), 0);
  for (let t = 0; t < tl.duration + FLASH_MS; t += 10) assert.equal(rayFlash(bolt('fire'), t), 0);
});

test('the renderer lays marks flat on the floor and clears them', () => {
  const parent = new THREE.Group();
  const marks = createRayMarks(THREE, parent);
  assert.equal(parent.children.length, 2);
  assert.equal(marks.add(bolt('fire')), 4);
  assert.equal(marks.add(bolt('magic missile')), 0);
  let r = marks.update(.4, {x: 1, z: 0});
  assert.ok(r.count >= 4 && r.flash === 0);
  const [dark, glow] = marks.layers;
  assert.equal(dark.count, 4); assert.equal(glow.count, 4);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (const mesh of marks.layers) for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m); m.decompose(p, q, s);
    assert.ok(p.y >= MARK_Y && p.y < .03, `y ${p.y}`);
    assert.ok(p.x >= 2 && p.x <= 5, `x ${p.x}`);
    assert.ok(s.x > 0 && s.x < .95 && Math.abs(s.x - s.z) < 1e-6);
  }
  // Embers cool first, then the scorch goes.
  marks.update(2);
  assert.equal(glow.count, 0); assert.equal(dark.count, 4);
  marks.update(longest('fire') / 1000);
  assert.equal(dark.count, 0); assert.equal(marks.active, 0);

  marks.add(bolt('lightning'));
  let flash = 0;
  for (let i = 0; i < 10; i++) flash = Math.max(flash, marks.update(.01).flash);
  assert.ok(flash > .5);
  marks.clear();
  assert.equal(marks.active, 0); assert.equal(dark.count + glow.count, 0);
  marks.dispose();
  assert.equal(parent.children.length, 0);
});
