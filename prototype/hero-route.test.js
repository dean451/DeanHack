import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planRoute, walkRoute, ROUTE} from './hero-route.js';

// A map from rows of text: '.' floor, '#' corridor, '|' wall, '+' closed door, ' ' unknown.
function cells(rows) {
  const out = [], kinds = {'.': 'floor', '#': 'corridor', '|': 'wall', '+': 'door', ' ': 'unknown'};
  rows.forEach((row, z) => [...row].forEach((ch, x) => out.push({x, z, terrain: kinds[ch]})));
  return out;
}

test('a move of several squares is routed around a wall, never through it', () => {
  const map = cells(['.....', '.|||.', '.....']);
  const path = planRoute(map, {x: 2, z: 0}, {x: 2, z: 2});
  assert.ok(path, 'a route exists');
  assert.deepEqual(path[0], {x: 2, z: 0});assert.deepEqual(path.at(-1), {x: 2, z: 2});
  const wall = new Set(['1,1', '2,1', '3,1']);
  assert.ok(path.every(c => !wall.has(`${c.x},${c.z}`)), 'it goes round the wall');
  for (let i = 1; i < path.length; i++) assert.ok(Math.max(Math.abs(path[i].x - path[i - 1].x), Math.abs(path[i].z - path[i - 1].z)) === 1, 'one square at a time');
});

test('a single step, a teleport across rock or a far longer detour is not walked', () => {
  const map = cells(['...', '...']);
  assert.equal(planRoute(map, {x: 0, z: 0}, {x: 1, z: 1}), null, 'one step: the ordinary glide');
  const rock = cells(['..   ..']);
  assert.equal(planRoute(rock, {x: 0, z: 0}, {x: 6, z: 0}), null, 'no open way: a jump');
  const winding = cells(['.|.', '.|.', '.|.', '.|.', '.|.', '.|.', '...']);
  assert.equal(planRoute(winding, {x: 0, z: 0}, {x: 2, z: 0}, {detour: 2}), null, 'a route many times the jump is a teleport, not a walk');
  assert.equal(planRoute(cells(['.+.']), {x: 0, z: 0}, {x: 2, z: 0}), null, 'a closed door blocks');
});

test('the hero walks the route briskly, turning along it, and a long one still takes about a second', () => {
  const hero = {g: {position: {x: 0, y: 0, z: 0}}, route: [{x: 1, z: 0}, {x: 2, z: 0}, {x: 2, z: 1}]};
  let t = 0;while (walkRoute(hero, 1 / 60)) { t += 1 / 60;if (hero.g.position.x >= 2 && hero.g.position.z > 0) assert.ok(Math.abs(hero.routeYaw) < 1e-6, 'heading +z on the last leg'); }
  assert.deepEqual([hero.g.position.x, hero.g.position.z], [2, 1]);
  assert.ok(Math.abs(t - 3 / ROUTE.speed) < .05, `three squares at ${ROUTE.speed}/s (${t.toFixed(2)} s)`);
  assert.equal(hero.route, null);
  const far = {g: {position: {x: 0, y: 0, z: 0}}, route: Array.from({length: 40}, (_, i) => ({x: i + 1, z: 0}))};
  t = 0;while (walkRoute(far, 1 / 60)) t += 1 / 60;
  assert.ok(t <= ROUTE.maxSeconds + .05, `forty squares in ${t.toFixed(2)} s`);
});

test('live.js plans the route when the hero moves several squares and walks it instead of sliding', () => {
  const live = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.match(live, /const path=planRoute\(frame\.cells,from,to\)/);
  assert.match(live, /if\(!walkRoute\(hero,dt\)\)hero\.g\.position\.lerp\(hero\.target,1-Math\.exp\(-dt\*14\)\);/);
  assert.match(live, /else if\(v\.type==='teleport'\)\{heroTeleportAt=performance\.now\(\);/, 'a teleport still jumps');
});
