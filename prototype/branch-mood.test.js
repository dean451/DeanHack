import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {moodFor, scarPlan, gridEdges, glowAt, GLOW_REACH, SCAR_ONE_IN, createBranchMood, DUST} from './branch-mood.js';

// A room of open floor x 1..8, z 1..6 walled round, as live.js's tiles ("x,z" -> {userData: {type}}).
function room() {
  const tiles = new Map();
  for (let x = 0; x <= 9; x++) for (let z = 0; z <= 7; z++) {
    const wall = x === 0 || x === 9 || z === 0 || z === 7;
    const t = new THREE.Group(); t.userData.type = wall ? 'wall' : 'room'; tiles.set(`${x},${z}`, t);
  }
  return tiles;
}
const squares = tiles => new Map([...tiles].map(([id, t]) => [id, t.userData.type === 'wall' ? 'wall' : 'open']));

test('each branch has its own mood; the main dungeon has none from here', () => {
  assert.equal(moodFor('The Gnomish Mines'), 'mines');
  assert.equal(moodFor('Sokoban'), 'sokoban');
  assert.equal(moodFor('Gehennom'), 'gehennom');
  assert.equal(moodFor('The Dungeons of Doom'), null);
  assert.equal(moodFor(undefined), null);
});

test('pickaxe scars go only on wall faces that look onto open ground, a share of them, the same every time', () => {
  const sq = squares(room()), plan = scarPlan(sq);
  assert(plan.length > 0);
  for (const s of plan) {
    assert.equal(sq.get(`${s.x},${s.z}`), 'wall');
    assert.equal(sq.get(`${s.x + s.dx},${s.z + s.dz}`), 'open');
    assert(s.gouges.length >= 2 && s.gouges.length <= 4);
    for (const g of s.gouges) assert(g.y > .1 && g.y < .55 && Math.abs(g.u) < .4 && g.len > .1 && g.len < .3, JSON.stringify(g));
  }
  // faces onto open ground: 2 * 8 + 2 * 6 = 28; about one in SCAR_ONE_IN is scarred
  assert(plan.length < 28 * 2 / SCAR_ONE_IN + 3, String(plan.length));
  assert.deepEqual(scarPlan(sq), plan);
});

test('the Sokoban grid draws each floor edge once', () => {
  const edges = gridEdges(new Map([['1,1', 'open'], ['2,1', 'open'], ['0,1', 'wall']]));
  // two squares side by side: 7 distinct unit edges
  assert.equal(edges.length, 7);
  for (const [ax, az, bx, bz] of edges) assert.equal(Math.hypot(bx - ax, bz - az), 1);
});

test('the lantern dust is brightest by the hero and gone at the edge of the light', () => {
  assert.equal(glowAt(0), 1);
  assert(glowAt(1) > glowAt(1.5) && glowAt(1.5) > 0);
  assert.equal(glowAt(GLOW_REACH), 0);
});

test('the mood follows the branch: Mines dust and scars, Sokoban grid and still air, Gehennom haze', () => {
  const group = new THREE.Group(), motes = new THREE.Points(), m = createBranchMood({group, cavernMotes: motes}), tiles = room(), origin = {x: 4, z: 3};
  const hero = new THREE.Vector3(.5, 0, .5);
  m.frame('The Gnomish Mines', tiles, origin);
  assert(m.dust.visible && m.scars && !m.grid && !m.haze.visible && motes.visible);
  for (let f = 0; f < 120; f++) m.update(f / 30, 1 / 30, hero);
  const p = m.dust.geometry.attributes.position, c = m.dust.geometry.attributes.color;
  for (let i = 0; i < DUST; i++) {
    assert(Math.hypot(p.getX(i) - hero.x, p.getZ(i) - hero.z) <= GLOW_REACH + 1e-6);
    assert(c.getX(i) >= c.getY(i) && c.getY(i) >= c.getZ(i), 'warm');
  }
  // the scars sit on the room's walls, in scene space
  const box = new THREE.Box3().setFromObject(m.scars);
  assert(box.min.x > -4.6 && box.max.x < 5.6 && box.min.y > 0 && box.max.y < .63, JSON.stringify(box));
  // unchanged squares: not rebuilt
  const scars = m.scars; m.frame('The Gnomish Mines', tiles, origin); assert.equal(m.scars, scars);

  m.frame('Sokoban', tiles, origin);
  assert(m.grid && !m.scars && !m.dust.visible && !motes.visible);
  m.frame('Gehennom', tiles, origin);
  assert(!m.grid && !m.scars && m.haze.visible && motes.visible);
  m.update(3, .1, new THREE.Vector3(2, 0, 1));
  assert.equal(m.haze.position.x, 2);
  m.frame('The Dungeons of Doom', tiles, origin);
  assert(!m.grid && !m.scars && !m.haze.visible && !m.dust.visible && motes.visible);
  m.dispose();
  assert(!group.children.includes(m.root));
});

test('live.js drives the mood each frame and each render', () => {
  const src = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert(/branchMood\.frame\(frame\.dungeon,tiles,origin\)/.test(src));
  assert(/branchMood\.update\(t,dt,hero\.g\.position\)/.test(src));
});
