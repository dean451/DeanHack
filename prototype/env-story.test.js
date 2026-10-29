import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEnvStory, planStory, piecesFor, storyKind, levelSeed, SOURCE_MAX, DECAL_MAX, BONE_MAX} from './env-story.js';

// A room of floor with walls round it, as the bridge sends it (terrain, kind 'terrain').
function room(w = 12, h = 9) {
  const cells = [];
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const edge = x === 0 || z === 0 || x === w - 1 || z === h - 1;
    cells.push({x, z, terrain: edge ? 'wall' : 'floor', kind: 'terrain', visible: true, remembered: true, symbol: 46, color: 7});
  }
  return cells;
}
const put = (cells, x, z, fields) => { const c = cells.find(c => c.x === x && c.z === z); Object.assign(c, fields); return cells; };
const FIRE = {terrain: 'feature', symbol: 94, color: 9, trap: 'fire trap'};
const PIT = {terrain: 'feature', symbol: 94, color: 0, trap: 'spiked pit'};
const TRAPDOOR = {terrain: 'feature', symbol: 94, color: 3, trap: 'trap door'};
const FOUNTAIN = {terrain: 'fountain', symbol: 123, color: 4};
const frameOf = (cells, depth = 3) => ({branch: 0, depth, cells, player: {x: 1, z: 1}});
const lookup = cells => { const m = new Map(cells.map(c => [`${c.x},${c.z}`, c])); return (x, z) => m.get(`${x},${z}`); };

function scene(cells, depth) {
  const parent = new THREE.Group(), story = createEnvStory(THREE, parent);
  story.frame(frameOf(cells, depth), {x: 0, z: 0});
  return {parent, story};
}
const positions = parent => { const out = []; parent.traverse(o => { if (o.isMesh) out.push([o.name, Array.from(o.geometry.attributes.position.array)]); }); return out; };

test('only the features that justify it tell a story', () => {
  assert.equal(storyKind({terrain: 'feature', ...FIRE}), 'scorch');
  assert.equal(storyKind({terrain: 'feature', symbol: 94, color: 9}), 'scorch'); // an older bridge: orange '^'
  assert.equal(storyKind(PIT), 'bones');
  assert.equal(storyKind(TRAPDOOR), 'bones');
  assert.equal(storyKind({terrain: 'feature', symbol: 94, color: 0, trap: 'pit'}), 'bones');
  assert.equal(storyKind({terrain: 'feature', symbol: 94, color: 3, trap: 'hole'}), 'bones');
  assert.equal(storyKind(FOUNTAIN), 'stain');
  assert.equal(storyKind({terrain: 'floor', door: 'broken'}), 'gouges');
  for (const c of [{terrain: 'floor'}, {terrain: 'floor', door: 'open'}, {terrain: 'door'}, {terrain: 'altar'}, {terrain: 'grave'},
    {terrain: 'feature', symbol: 94, color: 6, trap: 'bear trap'}, {terrain: 'feature', symbol: 94, color: 4, trap: 'rust trap'}, null])
    assert.equal(storyKind(c), null, JSON.stringify(c));
});

test('a bare room draws nothing', () => {
  const {parent, story} = scene(room());
  assert.equal(positions(parent).length, 0);
  assert.equal(story.sources().length, 0);
});

test('the dressing is the same every frame and for the same cell, whatever the cell order', () => {
  const cells = put(put(put(room(), 3, 3, FIRE), 8, 4, PIT), 5, 6, FOUNTAIN);
  const a = scene(cells), b = scene([...cells].reverse());
  assert.deepEqual(positions(a.parent), positions(b.parent));
  // Another frame of the same level leaves the meshes untouched.
  const before = a.parent.children[0].children.slice();
  a.story.frame(frameOf(structuredClone(cells)), {x: 0, z: 0});
  assert.deepEqual(a.parent.children[0].children, before);
  // The same feature somewhere else, or on another level, is dressed differently.
  const moved = scene(put(room(), 4, 3, FIRE)), there = scene(put(room(), 3, 3, FIRE));
  assert.notDeepEqual(positions(moved.parent)[0][1].map((v, i) => i % 3 === 0 ? v - 1 : v), positions(there.parent)[0][1]);
  assert.notDeepEqual(planStory([{kind: 'scorch', x: 3, z: 3}], lookup(cells), levelSeed('0:3')), planStory([{kind: 'scorch', x: 3, z: 3}], lookup(cells), levelSeed('0:4')));
});

test('dressing lies only on floor squares next to its feature, near their edge', () => {
  const cells = put(put(put(room(), 3, 3, FIRE), 8, 4, PIT), 5, 6, FOUNTAIN), at = lookup(cells);
  for (const s of [{kind: 'scorch', x: 3, z: 3}, {kind: 'bones', x: 8, z: 4}, {kind: 'stain', x: 5, z: 6}]) {
    const {decals, bones} = piecesFor(s, (dx, dz) => at(s.x + dx, s.z + dz), 7);
    assert.ok(decals.length > 0, s.kind);
    const points = [];
    for (const d of decals) for (let i = 0; i < d.tris.length; i += 2) points.push([d.tris[i], d.tris[i + 1]]);
    for (const b of bones) points.push([b.x, b.z]);
    for (const [x, z] of points) {
      const cx = Math.round(x), cz = Math.round(z);
      assert.ok(Math.abs(cx - s.x) <= 1 && Math.abs(cz - s.z) <= 1, `${s.kind} strays to ${cx},${cz}`);
      // The feature's own square is drawn by its model; the story spills onto the floor round it.
      if (cx === s.x && cz === s.z) assert.ok(Math.max(Math.abs(x - s.x), Math.abs(z - s.z)) > .45, `${s.kind} covers its feature at ${x},${z}`);
      else {
        assert.equal(at(cx, cz).terrain, 'floor', `${s.kind} on ${at(cx, cz).terrain}`);
        // Nothing lies over the middle of a neighbouring square, where an item or monster stands.
        assert.ok(Math.hypot(x - cx, z - cz) > .12, `${s.kind} at the middle of ${cx},${cz}`);
      }
    }
  }
});

test('the bones lie beside the pit, the skull among them', () => {
  const cells = put(room(), 5, 4, PIT), {bones} = planStory([{kind: 'bones', x: 5, z: 4}], lookup(cells), 2);
  assert.ok(bones.length >= 3 && bones.length <= 4);
  assert.equal(bones.filter(b => b.shape === 'skull').length, 1);
  for (const b of bones) assert.ok(Math.hypot(b.x - 5, b.z - 4) < 1.2);
});

test('a pit walled in on every side has nowhere to put its bones', () => {
  const cells = room(3, 3);
  put(cells, 1, 1, PIT);
  const {decals, bones} = planStory([{kind: 'bones', x: 1, z: 1}], lookup(cells), 0);
  assert.equal(decals.length + bones.length, 0);
});

test('a broken door is gouged on the floor either side of the doorway, not in the walls', () => {
  // A door in the room's west wall at (0,4) with floor east of it and a corridor west of it.
  const cells = room();
  put(cells, 0, 4, {terrain: 'floor', door: 'broken'});
  cells.push({x: -1, z: 4, terrain: 'floor', kind: 'terrain'});
  const at = lookup(cells), {decals} = piecesFor({kind: 'gouges', x: 0, z: 4}, (dx, dz) => at(dx, 4 + dz), 1);
  assert.ok(decals.length >= 8, `${decals.length} strokes`);
  const sides = new Set();
  for (const d of decals) for (let i = 0; i < d.tris.length; i += 2) {
    const cx = Math.round(d.tris[i]), cz = Math.round(d.tris[i + 1]);
    assert.equal(cz, 4, 'a gouge runs into the wall');
    sides.add(cx);
  }
  assert.deepEqual([...sides].sort(), [-1, 1]);
  // A broken door with walls on all sides is not a doorway the client can read: nothing.
  const boxed = room(3, 3);put(boxed, 1, 1, {terrain: 'floor', door: 'broken'});
  for (const c of boxed) if (c.terrain === 'floor' && !c.door) c.terrain = 'wall';
  assert.equal(planStory([{kind: 'gouges', x: 1, z: 1}], lookup(boxed), 0).decals.length, 0);
});

test('a monster on a trap does not wipe its story; the trap gone does', () => {
  const cells = put(room(), 4, 4, FIRE), {parent, story} = scene(cells);
  const meshes = positions(parent);
  assert.equal(story.sources().length, 1);
  put(cells, 4, 4, {kind: 'monster', terrain: 'floor', symbol: 100, color: 3, trap: undefined, name: 'jackal'});
  story.frame(frameOf(cells), {x: 0, z: 0});
  assert.deepEqual(positions(parent), meshes);
  put(cells, 4, 4, {kind: 'terrain', terrain: 'floor', symbol: 46, color: 7, name: ''});
  story.frame(frameOf(cells), {x: 0, z: 0});
  assert.equal(story.sources().length, 0);
  assert.equal(positions(parent).length, 0);
});

test('a new level starts clean, and clear empties the scene', () => {
  const cells = put(room(), 4, 4, FIRE), {parent, story} = scene(cells);
  assert.ok(positions(parent).length > 0);
  story.frame(frameOf(room(), 4), {x: 0, z: 0});
  assert.equal(positions(parent).length, 0);
  story.frame(frameOf(cells, 4), {x: 0, z: 0});
  story.clear();
  assert.equal(positions(parent).length, 0);
});

test('a level crowded with features stays inside the caps: two draws, no lights', () => {
  const cells = room(60, 20);
  let n = 0;
  for (let z = 2; z < 18; z += 3) for (let x = 2; x < 58; x += 3, n++) put(cells, x, z, [FIRE, PIT, FOUNTAIN, TRAPDOOR][n % 4]);
  const {parent, story} = scene(cells);
  const plan = story.plan();
  assert.ok(n > SOURCE_MAX);
  assert.ok(plan.decals.length <= DECAL_MAX, `${plan.decals.length} decals`);
  assert.ok(plan.bones.length <= BONE_MAX, `${plan.bones.length} bones`);
  let meshes = 0;
  parent.traverse(o => { assert.ok(!o.isLight, 'a light'); assert.ok(!o.isPoints, 'particles'); if (o.isMesh) meshes++; });
  assert.ok(meshes <= 2, `${meshes} draws`);
  // The decals share one transparent material that never writes depth, so they cannot hide what stands on them.
  const decal = parent.getObjectByName('EnvStoryDecals');
  assert.equal(decal.material.depthWrite, false);
  assert.equal(decal.geometry.attributes.color.itemSize, 4);
});

test('the dressing stays low: flat decals and bones that lie on the floor', () => {
  const cells = put(put(room(), 3, 3, FIRE), 8, 4, PIT), {parent} = scene(cells);
  parent.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(parent);
  assert.ok(box.max.y < .15, `top at ${box.max.y}`); // a skull on its side is the tallest thing
  assert.ok(box.min.y > -.045, `bottom at ${box.min.y}`); // the slab top is -.03; a tilted bone may bed in a little
});
