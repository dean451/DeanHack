// The hero walking a multi-square move. Travel and autoexplore (`_`, `v`, a click far away) run in the engine and
// the next frame shows the hero already at the end, many squares on: before, she slid there in a straight line
// in a fifth of a second, through walls, the camera lurching after her. Now the move is laid along a route over
// the squares she could have walked (planRoute: a breadth-first search over the frame's open cells, diagonals
// allowed), and she walks it briskly (walkRoute), fast enough that a long route still takes about a second.
// A route that cannot be found, or is far longer than the jump (a teleport, a trapdoor), is not walked.
export const ROUTE = {minJump: 1.5, maxCells: 120, detour: 4, speed: 9, maxSeconds: 1.1, arrive: .04};

const BLOCKED = /^(wall|unknown|door|tree|stone|water|moat|pool|lava|iron bars)$/;

// cells: the frame's cells ({x, z, terrain}); from, to: {x, z} map squares. Returns the squares from `from` to
// `to` (both included) or null.
export function planRoute(cells, from, to, {maxCells = ROUTE.maxCells, detour = ROUTE.detour} = {}) {
  const jump = Math.max(Math.abs(to.x - from.x), Math.abs(to.z - from.z));
  if (jump < ROUTE.minJump) return null;
  const key = (x, z) => `${x},${z}`, open = new Set();
  for (const c of cells ?? []) if (!BLOCKED.test(c.terrain ?? 'unknown')) open.add(key(c.x, c.z));
  open.add(key(from.x, from.z));open.add(key(to.x, to.z));
  const prev = new Map([[key(from.x, from.z), null]]), queue = [[from.x, from.z]];
  for (let i = 0; i < queue.length && queue.length <= maxCells * 8; i++) {
    const [x, z] = queue[i];
    if (x === to.x && z === to.z) break;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const k = key(x + dx, z + dz);
      if (!open.has(k) || prev.has(k)) continue;
      // no squeezing diagonally between two blocked squares
      if (dx && dz && !open.has(key(x + dx, z)) && !open.has(key(x, z + dz))) continue;
      prev.set(k, key(x, z));queue.push([x + dx, z + dz]);
    }
  }
  if (!prev.has(key(to.x, to.z))) return null;
  const path = [];
  for (let k = key(to.x, to.z); k; k = prev.get(k)) { const [x, z] = k.split(',').map(Number);path.push({x, z}); }
  path.reverse();
  if (path.length > maxCells || path.length - 1 > jump * detour + 2) return null;
  return path;
}

// actor.route: the points still to walk (scene coordinates, {x, z}); moves actor.g along it and sets
// actor.routeYaw to the heading. The pace is ROUTE.speed squares a second, or faster for a long route so the
// whole walk takes at most ROUTE.maxSeconds. Returns true while walking.
export function walkRoute(actor, dt) {
  const route = actor.route;
  if (!route?.length) return false;
  const pos = actor.g.position;
  if (actor.routeSpeed === undefined) {
    let left = 0, from = pos;
    for (const p of route) { left += Math.hypot(p.x - from.x, p.z - from.z);from = p; }
    actor.routeSpeed = Math.max(ROUTE.speed, left / ROUTE.maxSeconds);
  }
  let step = actor.routeSpeed * dt;
  while (route.length && step > 0) {
    const p = route[0], dx = p.x - pos.x, dz = p.z - pos.z, d = Math.hypot(dx, dz);
    if (d > 1e-6) actor.routeYaw = Math.atan2(dx, dz);
    if (d <= step || d < ROUTE.arrive) { pos.x = p.x;pos.z = p.z;step -= d;route.shift();continue; }
    pos.x += dx / d * step;pos.z += dz / d * step;step = 0;
  }
  if (!route.length) { actor.route = null;actor.routeSpeed = undefined; }
  return true;
}
