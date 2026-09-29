import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline, FX_TICK_MS} from './fx.js';
import {RAY_LOOKS, DIG_LOOK, RAY_FADE_MS, SPARK_MS, MIRROR_MS, GRIT_MS, PUFF_MS, GRIT_PER_CELL, PUFFS_PER_CELL, CHIPS_PER_CELL, RAY_Y, rayLook, rayBounces, rayFrame, raySparks, markMirrors, mirrorFlash, reflectorAt, digCells, solidAt, digGrit, rubble, createRays} from './rays.js';

const zap = (type, dir) => ({kind: 'zap', zap: type, dir});
// A fire bolt going east from x=3, hitting a wall past x=6 and coming back to x=4.
const bolt = (type = 'fire') => fxTimeline({steps: [
  {op: 'start', mode: 'beam', glyph: 1, effect: zap(type, 'horizontal')},
  ...[3, 4, 5, 6, 6, 5, 4].flatMap(x => [{op: 'draw', x, z: 2}, {op: 'tick'}]),
  {op: 'end'},
]});

test('every zap type has a finite look and anything else has none', () => {
  for (const [name, L] of Object.entries(RAY_LOOKS)) {
    assert.equal(rayLook(zap(name, 'vertical')), L);
    for (const k of ['width', 'glowWidth']) assert.ok(Number.isFinite(L[k]) && L[k] > 0 && L[k] < .5, `${name}.${k}`);
    assert.ok(L.flicker >= 0 && L.flicker < 1, `${name}.flicker`);
  }
  assert.equal(rayLook({kind: 'object', otyp: 3}), null);
  assert.equal(rayLook({kind: 'zap', zap: 'banana'}), null);
  assert.equal(rayLook(null), null);
});

test('a wall bounce is found where the beam turns, at the wall edge', () => {
  const b = rayBounces(bolt());
  assert.equal(b.length, 1);
  assert.equal(b[0].x, 6.5); assert.equal(b[0].z, 2);
  assert.equal(b[0].t, 4 * FX_TICK_MS);
  assert.deepEqual(b[0].outDir, [-1, 0]);
  assert.equal(b[0].back, true);
  // A diagonal glancing off a wall turns without reversing.
  const glance = fxTimeline({steps: [{op: 'start', mode: 'beam', glyph: 1, effect: zap('cold', 'lslant')},
    ...[[1, 1], [2, 2], [3, 3], [4, 2], [5, 1]].flatMap(([x, z]) => [{op: 'draw', x, z}, {op: 'tick'}]), {op: 'end'}]});
  const g = rayBounces(glance);
  assert.equal(g.length, 1);
  assert.equal(g[0].back, false);
  assert.deepEqual(g[0].outDir, [1, -1]);
  // Thrown objects are not rays.
  assert.equal(rayBounces(fxTimeline({steps: [{op: 'start', mode: 'flash', effect: {kind: 'object'}},
    {op: 'draw', x: 1, z: 1}, {op: 'tick'}, {op: 'draw', x: 2, z: 1}, {op: 'tick'}, {op: 'end'}]})).length, 0);
});

test('the beam grows cell by cell, keeps its trail, then fades to nothing', () => {
  const tl = bolt('lightning');
  const counts = [];
  for (let t = 0; t <= tl.duration + RAY_FADE_MS + 20; t += 10) {
    const segs = rayFrame(tl, t);
    for (const s of segs) {
      for (const k of ['x', 'z', 'yaw', 'intensity', 'offset']) assert.ok(Number.isFinite(s[k]), k);
      assert.ok(s.intensity >= 0 && s.intensity <= 1);
      assert.ok(Math.abs(s.offset) <= RAY_LOOKS.lightning.jag + 1e-9);
    }
    assert.ok(segs.filter(s => s.head).length <= 1);
    counts.push(segs.length);
  }
  assert.equal(counts[0], 1);
  assert.equal(Math.max(...counts), 7);
  assert.equal(counts.at(-1), 0);
  assert.ok(rayFrame(tl, tl.duration + RAY_FADE_MS / 2).every(s => s.intensity < .6));
});

test('sparks fly from the bounce, fall, stay near it and die out', () => {
  const b = rayBounces(bolt());
  assert.equal(raySparks(b, b[0].t - 1).length, 0);
  assert.equal(raySparks(b, b[0].t + SPARK_MS).length, 0);
  for (let t = b[0].t; t < b[0].t + SPARK_MS; t += 16) {
    for (const s of raySparks(b, t)) {
      for (const k of ['x', 'y', 'z', 'alpha']) assert.ok(Number.isFinite(s[k]), k);
      assert.ok(Math.hypot(s.x - 6.5, s.z - 2) < 1.1);
      assert.ok(s.y >= .02 && s.y < RAY_Y + .3);
      assert.ok(s.alpha > 0 && s.alpha <= 1);
      // A reflection straight back throws its sparks back the way the beam came.
      assert.ok(s.x <= 6.5 + 1e-9);
    }
  }
});

// A sleep ray going east that reflects straight back off whoever stands at x=6.
const reflected = (type = 'sleep') => fxTimeline({steps: [
  {op: 'start', mode: 'beam', glyph: 1, effect: zap(type, 'horizontal')},
  ...[3, 4, 5, 6, 5, 4, 3].flatMap(x => [{op: 'draw', x, z: 2}, {op: 'tick'}]),
  {op: 'end'},
]});

test('reflectorAt finds the hero or a visible monster on a cell', () => {
  const frame = {player: {x: 6, z: 2}, cells: [
    {x: 8, z: 2, kind: 'monster', visible: true}, {x: 9, z: 2, kind: 'monster', visible: false},
    {x: 10, z: 2, kind: 'pet', visible: true}, {x: 11, z: 2, kind: 'object', visible: true}]};
  assert.equal(reflectorAt(frame, 6, 2), 'hero');
  assert.equal(reflectorAt(frame, 8, 2), 'monster');
  assert.equal(reflectorAt(frame, 9, 2), null);
  assert.equal(reflectorAt(frame, 10, 2), 'monster');
  assert.equal(reflectorAt(frame, 11, 2), null);
  assert.equal(reflectorAt(null, 6, 2), null);
});

test('a reversal on a creature is a mirror; a wall bounce never is', () => {
  const hero = (x, z) => x === 6 && z === 2 ? 'hero' : null;
  const [m] = markMirrors(rayBounces(reflected()), hero);
  assert.deepEqual(m.mirror, {x: 6, z: 2, dir: [1, 0], who: 'hero'});
  // Sparks come off the creature's face towards the beam, not the far edge.
  assert.ok(Math.abs(m.x - 5.7) < 1e-9);
  // Nobody there: an ordinary bounce. A wall at 6.5 with a creature a cell short isn't one.
  assert.equal(markMirrors(rayBounces(reflected()), () => null)[0].mirror, undefined);
  assert.equal(markMirrors(rayBounces(bolt()), (x, z) => x === 5 && z === 2 ? 'monster' : null)[0].mirror, undefined);
  // Without a lookup, bounces are left as they were.
  assert.equal(markMirrors(rayBounces(reflected()))[0].mirror, undefined);
});

test('the mirror flash snaps open facing the beam and fades out', () => {
  for (const type of Object.keys(RAY_LOOKS)) {
    const [b] = markMirrors(rayBounces(reflected(type)), (x, z) => x === 6 && z === 2 ? 'monster' : null);
    assert.equal(mirrorFlash(b, b.t - 1), null);
    assert.equal(mirrorFlash(b, b.t + MIRROR_MS), null);
    let peak = 0, lastRing = 0;
    for (let t = b.t; t < b.t + MIRROR_MS; t += 8) {
      const f = mirrorFlash(b, t);
      for (const k of ['x', 'z', 'yaw', 'size', 'alpha', 'ring', 'ringAlpha']) assert.ok(Number.isFinite(f[k]), `${type}.${k}`);
      assert.ok(f.size > 0 && f.size < .6 && f.ring > 0 && f.ring < 1);
      assert.ok(f.alpha >= 0 && f.alpha <= 1 && f.ringAlpha >= 0 && f.ringAlpha <= 1);
      assert.ok(f.ring >= lastRing); lastRing = f.ring;
      // In front of the creature, facing back west along the beam.
      assert.ok(Math.abs(f.x - 5.7) < 1e-9 && f.z === 2);
      assert.ok(Math.abs(f.yaw - Math.PI / 2) < 1e-9);
      peak = Math.max(peak, f.alpha);
    }
    assert.ok(peak > .7, type);
    assert.ok(mirrorFlash(b, b.t + MIRROR_MS - 8).alpha < .05);
  }
  assert.equal(mirrorFlash(rayBounces(bolt())[0], 200), null);
});

test('createRays draws a replay and ends empty', () => {
  const parent = new THREE.Group();
  const rays = createRays(THREE, parent);
  assert.equal(rays.play(fxTimeline({steps: [{op: 'start', mode: 'flash', effect: {kind: 'object'}}, {op: 'draw', x: 1, z: 1}, {op: 'tick'}, {op: 'end'}]})), false);
  assert.equal(rays.play(bolt('death')), true);
  let peak = 0;
  for (let i = 0; i < 60; i++) {
    const drawn = rays.update(1 / 60, {x: 3, z: 2});
    peak = Math.max(peak, drawn);
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let j = 0; j < rays.core.count; j++) {
      rays.core.getMatrixAt(j, m); p.setFromMatrixPosition(m);
      assert.ok(p.x >= -.5 && p.x <= 3.5 && Math.abs(p.z) < .2 && p.y === RAY_Y);
    }
  }
  assert.ok(peak >= 7);
  assert.equal(rays.active, 0);
  assert.equal(rays.core.count, 0);
  assert.equal(rays.sparks.geometry.drawRange.count, 0);
  // A reflection off the hero draws one flash and ring, then none.
  assert.equal(rays.play(reflected(), {reflectorAt: (x, z) => x === 6 && z === 2 ? 'hero' : null}), true);
  let flashes = 0;
  for (let i = 0; i < 60; i++) {
    rays.update(1 / 60, {x: 3, z: 2});
    assert.ok(rays.flash.count <= 1 && rays.ring.count === rays.flash.count);
    if (rays.flash.count) {
      flashes++;
      const m = new THREE.Matrix4(), p = new THREE.Vector3();
      rays.flash.getMatrixAt(0, m); p.setFromMatrixPosition(m);
      assert.ok(Math.abs(p.x - 2.7) < 1e-6 && Math.abs(p.z) < 1e-6 && p.y === RAY_Y);
    }
  }
  assert.ok(flashes > 5);
  assert.equal(rays.active, 0);
  assert.equal(rays.flash.count, 0);
  rays.play(bolt()); rays.update(.1, null); rays.clear();
  assert.equal(rays.core.count, 0);
  rays.dispose();
  assert.equal(parent.children.length, 0);
});

// A digging beam going north-east (x and z rising) from next to the hero at 2,2, through
// rock at 5,5 and 6,6.
const dig = () => fxTimeline({steps: [
  {op: 'start', mode: 'beam', glyph: 9, effect: {kind: 'dig', cmap: 36}},
  ...[3, 4, 5, 6].flatMap(i => [{op: 'draw', x: i, z: i}, {op: 'tick'}]),
  {op: 'end'},
]});
const rock = (x, z) => x >= 5 && z >= 5;

test('the digging beam has its own look, runs along its cells and never bounces', () => {
  assert.equal(rayLook({kind: 'dig', cmap: 36}), DIG_LOOK);
  assert.ok(!Object.values(RAY_LOOKS).includes(DIG_LOOK));
  const tl = dig();
  assert.equal(rayBounces(tl).length, 0);
  const segs = rayFrame(tl, tl.duration - 1);
  assert.equal(segs.length, 4);
  for (const s of segs) {
    assert.equal(s.look, DIG_LOOK);
    assert.ok(Math.abs(s.yaw - Math.PI / 4) < 1e-9);
  }
  // A single dug cell lies along the step from... nothing: it stays level at yaw 0.
  const one = fxTimeline({steps: [{op: 'start', mode: 'beam', effect: {kind: 'dig'}}, {op: 'draw', x: 1, z: 1}, {op: 'tick'}, {op: 'end'}]});
  assert.equal(rayFrame(one, 10)[0].yaw, 0);
  // A northward (map z falling) dig turns the other way.
  const north = fxTimeline({steps: [{op: 'start', mode: 'beam', effect: {kind: 'dig'}},
    ...[4, 3].flatMap(z => [{op: 'draw', x: 1, z}, {op: 'tick'}]), {op: 'end'}]});
  for (const s of rayFrame(north, north.duration - 1)) assert.ok(Math.abs(s.yaw + Math.PI / 2) < 1e-9);
});

test('digCells marks the solid cells and solidAt reads rock, walls and doors from a frame', () => {
  const cells = digCells(dig(), rock);
  assert.deepEqual(cells.map(c => [c.x, c.z, !!c.dug]), [[3, 3, false], [4, 4, false], [5, 5, true], [6, 6, true]]);
  for (const c of cells) assert.deepEqual(c.dir, [1, 1]);
  assert.ok(digCells(dig()).every(c => !c.dug));
  assert.deepEqual(digCells(bolt(), rock), []);
  const frame = {cells: [{x: 1, z: 1, terrain: 'floor'}, {x: 2, z: 1, terrain: 'wall'}, {x: 3, z: 1, terrain: 'unknown'},
    {x: 4, z: 1, terrain: 'door'}, {x: 5, z: 1, terrain: 'water'}]};
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(x => solidAt(frame, x, 1)), [false, true, true, true, false, true]);
  assert.equal(solidAt(null, 1, 1), false);
});

test('grit falls from every dug cell and dies out', () => {
  const cells = digCells(dig(), rock);
  assert.equal(digGrit(cells, -1).length, 0);
  assert.equal(digGrit(cells, cells[0].t + 10).length, GRIT_PER_CELL);
  for (let t = 0; t < cells.at(-1).t + GRIT_MS + 50; t += 12) {
    for (const g of digGrit(cells, t)) {
      for (const k of ['x', 'y', 'z', 'alpha']) assert.ok(Number.isFinite(g[k]), k);
      assert.ok(g.y >= .02 && g.y < RAY_Y + .2);
      assert.ok(g.alpha > 0 && g.alpha <= 1);
      assert.ok(g.x > 2 && g.x < 7.2 && g.z > 2 && g.z < 7.2);
    }
  }
  assert.equal(digGrit(cells, cells.at(-1).t + GRIT_MS).length, 0);
});

test('rubble billows from dug cells only, the chips land and everything clears', () => {
  const cells = digCells(dig(), rock);
  const dug = cells.filter(c => c.dug);
  assert.deepEqual(rubble(cells, dug[0].t - 1), {puffs: [], chips: []});
  let peak = 0;
  const rest = [];
  for (let t = dug[0].t; t < dug[1].t + PUFF_MS; t += 8) {
    const {puffs, chips} = rubble(cells, t);
    assert.ok(puffs.length <= 2 * PUFFS_PER_CELL && chips.length <= 2 * CHIPS_PER_CELL);
    for (const p of puffs) {
      for (const k of ['x', 'y', 'z', 'r', 'alpha']) assert.ok(Number.isFinite(p[k]), k);
      assert.ok(p.r > 0 && p.r < .35 && p.alpha >= 0 && p.alpha <= .7 && p.y > .1 && p.y < .75);
      assert.ok(Math.hypot(p.x - 5.5, p.z - 5.5) < 1.6);
      peak = Math.max(peak, p.alpha);
    }
    for (const c of chips) {
      for (const k of ['x', 'y', 'z', 'size', 'rx', 'ry']) assert.ok(Number.isFinite(c[k]), k);
      assert.ok(c.y >= c.size / 2 - 1e-9 && c.y < 1.1 && c.size >= 0 && c.size < .08);
      assert.ok(Math.hypot(c.x - 5.5, c.z - 5.5) < 3);
    }
    if (t > dug[1].t + 650 && t < dug[1].t + 670) rest.push(chips);
  }
  assert.ok(peak > .4);
  // By 650 ms every chip has come to rest on the floor.
  for (const chips of rest) for (const c of chips) assert.ok(Math.abs(c.y - c.size / 2) < 1e-9);
  assert.deepEqual(rubble(cells, dug[1].t + PUFF_MS), {puffs: [], chips: []});
});

test('createRays draws a dig with grit and rubble, then ends empty', () => {
  const parent = new THREE.Group();
  const rays = createRays(THREE, parent);
  assert.equal(rays.play(dig(), {solidAt: rock}), true);
  let puffs = 0, chips = 0, frames = 0;
  for (; rays.active && frames < 200; frames++) {
    rays.update(1 / 60, {x: 2, z: 2});
    puffs = Math.max(puffs, rays.puff.count); chips = Math.max(chips, rays.chip.count);
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let j = 0; j < rays.chip.count; j++) {
      rays.chip.getMatrixAt(j, m); p.setFromMatrixPosition(m);
      assert.ok([p.x, p.y, p.z].every(Number.isFinite) && p.y >= 0 && p.y < 1.1);
    }
  }
  assert.equal(puffs, 2 * PUFFS_PER_CELL);
  assert.equal(chips, 2 * CHIPS_PER_CELL);
  assert.ok(frames < 120);
  assert.equal(rays.puff.count + rays.chip.count + rays.core.count, 0);
  assert.equal(rays.sparks.geometry.drawRange.count, 0);
  rays.dispose();
  assert.equal(parent.children.length, 0);
});

test('magic missiles fly as a weaving volley of darts that bank off walls, pop, and leave nothing behind', async () => {
  const {missilePaths, missileFrame, missileTail, pathAt, VOLLEY, WEAVE} = await import('./missiles.js');
  const tl = bolt('magic missile');
  const [path] = missilePaths(tl);
  assert.equal(missilePaths(bolt('fire')).length, 0, 'only magic missiles');
  // x 3,4,5,6, then the repeat of 6 moves out to the wall edge, then back 5,4
  assert.deepEqual(path.pts.map(p => p.x), [3, 4, 5, 6, 6.45, 5, 4]);
  // the head moves smoothly and turns back at the wall
  assert.equal(pathAt(path, -1), null);
  assert.equal(pathAt(path, 1.5 * FX_TICK_MS).x, 4.5);
  assert.equal(pathAt(path, 4.5 * FX_TICK_MS).dx, -1);
  const tail = missileTail(path);
  let sawAll = false, pops = 0;
  for (let t = 0; t <= tail + 50; t += 4) {
    const f = missileFrame(path, t);
    if (f.darts.length === VOLLEY) sawAll = true;
    pops = Math.max(pops, f.pops.length);
    for (const d of f.darts) {
      for (const v of [d.x, d.y, d.z, d.yaw, d.size]) assert.ok(Number.isFinite(v));
      // never strays further than the weave from the line it flies along (z 2, chest height)
      assert.ok(Math.hypot(d.z - 2, d.y - RAY_Y) <= WEAVE * 1.21 + 1e-9, `dart off the path at ${t}`);
      assert.ok(d.x >= 3 - 1e-9 && d.x <= 6.5, `dart x ${d.x}`);
    }
    for (const p of f.pops) assert.ok(p.alpha >= 0 && p.alpha <= 1 && p.size > 0 && p.size < .4);
    for (const s of f.motes) assert.ok(Number.isFinite(s.x + s.y + s.z) && s.y >= .02 && s.alpha >= 0 && s.alpha <= 1);
  }
  assert.ok(sawAll, 'the whole volley is in the air at once');
  assert.equal(pops, VOLLEY, "every dart pops, and the pops overlap");
  const done = missileFrame(path, tail + 1);
  assert.equal(done.darts.length + done.pops.length + done.motes.length, 0);
});

test('createRays draws the magic missile volley, keeps the beam faint, and clears up', () => {
  const parent = new THREE.Group();
  const rays = createRays(THREE, parent);
  assert.ok(rays.play(bolt('magic missile')));
  let darts = 0, pops = 0, lit = 0;
  for (let i = 0; i < 120; i++) {
    lit = rays.update(1 / 60, {x: 0, z: 0});
    darts = Math.max(darts, rays.dart.count); pops = Math.max(pops, rays.pop.count);
  }
  assert.ok(darts >= 3 && pops >= 1, `darts ${darts} pops ${pops}`);
  assert.equal(rays.active, 0);
  assert.equal(lit, 0);
  assert.equal(rays.dart.count + rays.pop.count + rays.core.count, 0);
  // the beam under the darts is a dim wake next to a fire bolt's
  const wake = rayFrame(bolt('magic missile'), 60)[0].intensity * RAY_LOOKS['magic missile'].beam;
  assert.ok(wake < .4 * rayFrame(bolt('fire'), 60)[0].intensity);
  rays.dispose();
  assert.equal(parent.children.length, 0);
});
