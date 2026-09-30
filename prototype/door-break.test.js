import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {findBreaks, shardsFor, stepShard, halfHeight, shardScale, dustFrame, createDoorBreak, BREAK, SHARDS, MAX_BREAKS} from './door-break.js';

// A 5×5 room with a wall across z 2 and a door in it at (2, 2); the hero stands at `hero`.
// `door` is the door cell's state: 'closed', 'open', 'broken' or 'hidden' (broken, not in view).
const room = (door = 'closed', {hero = [2, 3], depth = 1, vertical = false} = {}) => {
  const cells = [];
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) {
    const [a, b] = vertical ? [z, x] : [x, z];
    const cell = {x, z, kind: 'terrain', terrain: b === 2 ? 'wall' : 'floor', visible: true};
    if (a === 2 && b === 2) {
      cell.terrain = door === 'closed' ? 'door' : 'floor';
      if (door === 'open') cell.door = 'open';
      if (door === 'hidden') cell.visible = false;
    }
    cells.push(cell);
  }
  return {branch: 'main', depth, player: {x: hero[0], z: hero[1]}, cells};
};

test('a door that becomes a doorway breaks, and shards fly away from the hero', () => {
  assert.deepEqual(findBreaks(room(), room('broken')), [{x: 2, z: 2, seed: 2 * 61 + 2 * 37, turn: 0, push: -1}]);
  assert.equal(findBreaks(room('closed', {hero: [2, 1]}), room('broken', {hero: [2, 1]}))[0].push, 1);
  assert.equal(findBreaks(room('open'), room('broken'))[0].push, -1, 'an open door can be smashed too');
  // A door in a wall running along z turns a quarter; the hero at x 3 pushes shards to -x.
  const v = findBreaks(room('closed', {vertical: true, hero: [3, 2]}), room('broken', {vertical: true, hero: [3, 2]}));
  assert.equal(v.length, 1);
  assert.equal(v[0].turn, Math.PI / 2);
  assert.equal(v[0].push, -1);
});

// room() plus a monster cell at each [x, z] (optionally unseen).
const withMonsters = (frame, spots, extra = {}) =>
  ({...frame, cells: [...frame.cells, ...spots.map(([x, z]) => ({x, z, kind: 'monster', glyph: 'H', name: 'hill giant', ...extra}))]});

test('a monster that breaks the door sends the shards away from itself, not from the hero', () => {
  // The hero is off to the side (not against the leaf); a giant south of the door smashes it
  // and steps into the doorway with the same move.
  const hero = {hero: [0, 3]};
  const giantSouth = withMonsters(room('closed', {hero: [4, 0]}), [[2, 1]]);
  assert.equal(findBreaks(giantSouth, withMonsters(room('broken', {hero: [4, 0]}), [[2, 2]]))[0].push, 1,
    'the giant south of the door (z 1) pushes shards north even though the hero is south too');
  assert.equal(findBreaks(withMonsters(room('closed', hero), [[2, 3]]), room('broken', hero))[0].push, -1);
  // A vertical door broken by a monster at x 1: shards go to +x, though the hero is at x 4.
  const vHero = {vertical: true, hero: [4, 0]};
  assert.equal(findBreaks(withMonsters(room('closed', vHero), [[1, 2]]), room('broken', vHero))[0].push, 1);
  // The hero against the leaf wins (a kick), even with a monster on the other side.
  assert.equal(findBreaks(withMonsters(room('closed'), [[2, 1]]), room('broken'))[0].push, -1);
  // Monsters on both sides, or only diagonal/far ones, or unseen ones: back to the hero's side.
  const far = {hero: [4, 4]};
  assert.equal(findBreaks(withMonsters(room('closed', far), [[2, 1], [2, 3]]), room('broken', far))[0].push, -1);
  assert.equal(findBreaks(withMonsters(room('closed', far), [[1, 1], [2, 0]]), room('broken', far))[0].push, -1);
  assert.equal(findBreaks(withMonsters(room('closed', far), [[2, 1]], {invisible: true}), room('broken', far))[0].push, -1);
  // A monster standing in an open doorway doesn't hide the door from findBreaks.
  assert.equal(findBreaks(withMonsters(room('open', far), [[2, 2]]), room('broken', far)).length, 1);
});

test('opening, closing, staying put, unseen breaks and level changes find nothing', () => {
  assert.deepEqual(findBreaks(room(), room('open')), []);
  assert.deepEqual(findBreaks(room('open'), room()), []);
  assert.deepEqual(findBreaks(room(), room()), []);
  assert.deepEqual(findBreaks(room('broken'), room('broken')), []);
  assert.deepEqual(findBreaks(room(), room('hidden')), []);
  assert.deepEqual(findBreaks(room(), room('broken', {depth: 2})), []);
  assert.deepEqual(findBreaks(null, room('broken')), []);
});

// Run a break's shards for `secs` in steps of `h`, calling `check(shard, t)` after each.
const run = (seed, secs, h, check) => {
  const shards = shardsFor(seed);
  for (let t = h; t <= secs + 1e-9; t += h) for (const s of shards) { stepShard(s, h); check?.(s, t); }
  return shards;
};

test('shards fly out on the push side, stay above the floor and come to rest lying flat', () => {
  for (const seed of [0, 7, 160, 999]) {
    const start = shardsFor(seed);
    assert.equal(start.length, SHARDS);
    for (const s of start) {
      assert.ok(s.vel[2] > 0, 'outwards');
      assert.ok(s.pos[1] >= halfHeight(s) - 1e-9, 'starts above the floor');
    }
    let maxOut = 0;
    const shards = run(seed, BREAK.sink, 1 / 60, s => {
      for (const v of [...s.pos, ...s.vel, ...s.rot]) assert.ok(Number.isFinite(v));
      assert.ok(s.pos[1] >= halfHeight(s) - 1e-9, 'never below the floor');
      assert.ok(s.pos[1] < 1.6, 'not too high');
      maxOut = Math.max(maxOut, s.pos[2]);
    });
    assert.ok(maxOut > .5, 'they leave the doorway');
    for (const s of shards) {
      assert.ok(Math.abs(s.pos[0]) < 3 && s.pos[2] < 3, `settles nearby (${s.pos})`);
      assert.ok(Math.hypot(...s.vel) < .02, 'at rest');
      assert.ok(Math.abs(s.pos[1] - s.size[2] / 2) < .004, 'lying on its face');
      assert.ok(Math.abs(Math.cos(s.rot[0])) < .02, 'flat (pitched a quarter turn, so the thin axis is upright)');
    }
  }
});

test('shards shrink away at the end and the dust clears', () => {
  assert.equal(shardScale(0), 1);
  assert.equal(shardScale(BREAK.sink), 1);
  assert.ok(shardScale((BREAK.sink + BREAK.life) / 2) > 0 && shardScale((BREAK.sink + BREAK.life) / 2) < 1);
  assert.equal(shardScale(BREAK.life), 0);
  let peak = 0;
  for (let t = 0; t < BREAK.dust; t += .02) for (const p of dustFrame(5, t)) {
    for (const v of [p.x, p.y, p.z, p.alpha]) assert.ok(Number.isFinite(v));
    assert.ok(p.y > 0 && p.y < 1.2 && p.alpha >= 0 && p.alpha <= 1);
    peak = Math.max(peak, p.alpha);
  }
  assert.ok(peak > .5);
  assert.deepEqual(dustFrame(5, BREAK.dust), []);
  assert.deepEqual(dustFrame(5, -1), []);
});

test('the renderer bursts a broken door, turns it with the door and cleans up', () => {
  const parent = new THREE.Group();
  const fx = createDoorBreak(THREE, parent);
  assert.deepEqual(fx.frame(room()), []);
  assert.equal(fx.frame(room('broken')).length, 1);
  let r = fx.update(1 / 60, {x: 2, z: 2});
  assert.deepEqual(r, {count: 1, shards: SHARDS, dust: r.dust});
  // Pushed to -z (hero at z 3): after a while the shards are on the far side of the wall.
  for (let i = 0; i < 60; i++) r = fx.update(1 / 60, {x: 2, z: 2});
  const mesh = parent.children.find(o => o.userData.part === 'door-break-shards');
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let behind = 0;
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m); m.decompose(p, q, s);
    for (const v of [p.x, p.y, p.z, s.x, s.y, s.z]) assert.ok(Number.isFinite(v));
    if (p.z < -.3) behind++;
  }
  assert.ok(behind > SHARDS / 2, `${behind} shards went away from the hero`);
  for (let i = 0; i < 40; i++) fx.add({x: i, z: 0, seed: i});
  assert.equal(fx.update(0).count, MAX_BREAKS);
  fx.update(BREAK.life / .1 * .1 + 1);
  let t = 0;
  while (fx.update(.1).count && t++ < 100);
  assert.equal(fx.update(0).count, 0, 'bursts end');
  assert.equal(mesh.count, 0);
  fx.dispose();
  assert.equal(parent.children.length, 0);
});
