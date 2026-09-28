import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {floodChange, floodFrame, createFlood, reachMs, SETTLE_MS, CREST_H, SHEET_Y, MAX_CELLS} from './flood.js';

// A 15×11 room of floor with the hero at (7, 5); wet(x, z) says which cells are water.
const room = (wet = () => false, {visible = () => true, depth = 3} = {}) => {
  const cells = [];
  for (let x = 0; x < 15; x++) for (let z = 0; z < 11; z++)
    cells.push({x, z, terrain: wet(x, z) ? 'water' : 'floor', visible: visible(x, z)});
  return {branch: 'main', depth, player: {x: 7, z: 5}, cells};
};
// do_flood's pattern: some floor within 5 of the hero turns to pool.
const flooded = (x, z) => Math.max(Math.abs(x - 7), Math.abs(z - 5)) <= 5 && (x + 2 * z) % 3 !== 0;

test('floodChange finds new pools round the hero, nearest first', () => {
  const f = floodChange(room(), room(flooded));
  assert.equal(f.kind, 'surge');
  assert.equal(f.x, 7); assert.equal(f.z, 5);
  assert.ok(f.cells.length > 20);
  for (let i = 1; i < f.cells.length; i++) assert.ok(f.cells[i].d >= f.cells[i - 1].d);
  assert.ok(f.far <= Math.hypot(5, 5) + 1e-9);
  assert.equal(f.duration, reachMs(f.far) + SETTLE_MS);
});

test('floodChange ignores no change, a new level, unseen cells and non-floor', () => {
  assert.equal(floodChange(room(), room()), null);
  assert.equal(floodChange(room(), room(flooded, {depth: 4})), null);
  assert.equal(floodChange(room(), room(flooded, {visible: () => false})), null);
  const lava = room(flooded); lava.cells.forEach(c => { if (c.terrain === 'water') c.terrain = 'lava'; });
  assert.equal(floodChange(room(), lava), null);
  assert.equal(floodChange(null, room()), null);
});

test('a confused scroll drains water back to floor', () => {
  const f = floodChange(room(flooded), room());
  assert.equal(f.kind, 'drain');
  const mid = floodFrame(f, f.duration / 2);
  assert.ok(mid.cells.every(c => c.fill >= 0 && c.fill <= 1));
  assert.ok(mid.spray.length > 0);
  const late = floodFrame(f, f.duration - 1);
  assert.ok(late.cells.every(c => c.fill < .01));
});

test('surge frames stay finite, bounded, and settle to a flat sheet', () => {
  const f = floodChange(room(), room(flooded));
  for (let t = 0; t < f.duration; t += 16) {
    const fr = floodFrame(f, t);
    assert.ok(fr);
    for (const c of fr.cells) {
      for (const v of [c.fill, c.h, c.foam]) assert.ok(Number.isFinite(v));
      assert.ok(c.fill >= 0 && c.fill <= 1);
      assert.ok(c.foam >= 0 && c.foam <= 1);
      assert.ok(c.h >= 0 && c.h <= SHEET_Y + CREST_H * 1.2);
      // Nothing fills before the front reaches it.
      if (t < reachMs(Math.hypot(c.x - 7, c.z - 5))) assert.equal(c.fill, 0);
    }
    assert.ok(fr.front.r >= 0 && fr.front.r <= f.far + .6);
    assert.ok(fr.front.alpha >= 0 && fr.front.alpha <= 1);
    for (const s of fr.spray) {
      for (const v of [s.x, s.y, s.z, s.alpha]) assert.ok(Number.isFinite(v));
      assert.ok(s.y >= 0 && s.y < 1);
      assert.ok(Math.hypot(s.x, s.z) < f.far + 1.5);
    }
  }
  const end = floodFrame(f, f.duration - 1);
  assert.ok(end.cells.every(c => c.fill > .99 && Math.abs(c.h - SHEET_Y) < .03));
  assert.equal(floodFrame(f, f.duration), null);
  assert.equal(floodFrame(f, -1), null);
});

test('createFlood draws, hides unfilled pools, and ends empty', () => {
  const scene = new THREE.Group();
  const fl = createFlood(THREE, scene);
  assert.equal(fl.add(room(), room()), null);
  const f = fl.add(room(), room(flooded));
  const far = f.cells.at(-1);
  const origin = {x: 7, z: 5};
  let st = fl.update(.05, origin);
  assert.equal(st.count, 1);
  assert.ok(fl.pending(far.x, far.z), 'far cell waits for the front');
  let maxSpray = 0, maxCells = 0;
  for (let i = 0; i < 120; i++) {
    st = fl.update(1 / 60, origin);
    maxSpray = Math.max(maxSpray, st.spray); maxCells = Math.max(maxCells, st.cells);
  }
  assert.ok(maxSpray > 0 && maxCells > 0 && maxCells <= MAX_CELLS);
  const ring = scene.children.find(m => m.userData.part === 'flood-front');
  assert.ok(Number.isFinite(ring.scale.x));
  st = fl.update(5, origin);
  assert.deepEqual(st, {count: 0, cells: 0, spray: 0});
  assert.equal(fl.pending(far.x, far.z), false);
  fl.add(room(), room(flooded)); fl.update(.1, origin);
  fl.clear();
  assert.equal(fl.update(0, origin).count, 0);
  fl.dispose();
  assert.equal(scene.children.length, 0);
});
