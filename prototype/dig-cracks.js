// Digging flavor: hairline cracks spread across the floor under the hero as the stone weakens.
// Each "You hit the rock with all your might." (see dig-chips.js) forks one more crack out of
// the hero's square, and every crack creeps outward over a moment, so a long dig leaves the
// tile webbed. The pit, hole or breach finishing the job takes them away (the chips and rubble
// take over). Cracks that nobody finishes fade out after a while. One LineSegments, capped, so
// the cost is a single draw.
//
// When live.js also passes the hero's heading (face), each crack is drawn twice: on the floor
// and again, stretched tall, on the wall face ahead of the hero, so the rock being worked is
// the rock that visibly splits.
//
// live.js calls message(text, x, z, face) with the hero's tile, update(dt) every frame and clear() on
// a level change.

import {clamp01, smooth, rng} from './fx-textures.js';
import {digMessage} from './dig-chips.js';

export const MAX_TILES = 3, MAX_CRACKS = 5, SEGS = 4;
export const GROW = .5, HOLD = 6, FADE = 1.5;

// Crack k of a tile: SEGS + 1 points as [x, z] about the tile centre, a jagged walk that
// never leaves the tile (within .46) and starts near the middle.
export function crackPath(seed, k) {
  const r = rng(seed * 53 + k * 17 + 3);
  let a = r() * Math.PI * 2, x = (r() - .5) * .2, z = (r() - .5) * .2;
  const pts = [[x, z]];
  for (let i = 0; i < SEGS; i++) {
    a += (r() - .5) * 1.3;
    const len = .09 + .09 * r();
    x = Math.max(-.46, Math.min(.46, x + Math.cos(a) * len));
    z = Math.max(-.46, Math.min(.46, z + Math.sin(a) * len));
    pts.push([x, z]);
  }
  return pts;
}

// How many segments of a crack that has been growing for t seconds are drawn (0..SEGS).
// Where point p of a crack lands on the wall face ahead (heading face, radians): offsets from
// the tile centre plus a height. The face sits just in front of the tile edge, and the crack is
// stretched sideways and tall so it spans the wall.
export function wallPoint(p, face) {
  const along = Math.max(-.44, Math.min(.44, p[0] * 1.5)), out = .47;
  const sn = Math.sin(face), cs = Math.cos(face);
  return {x: sn * out + cs * along, y: Math.max(.06, Math.min(.95, .5 + p[1] * 1.9)), z: cs * out - sn * along};
}

export const crackReach = t => Math.floor(SEGS * smooth(t / GROW) + 1e-9);

export function createDigCracks(THREE, parent) {
  const N = MAX_TILES * MAX_CRACKS * SEGS * 4;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setDrawRange(0, 0);
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false}));
  lines.frustumCulled = false; lines.renderOrder = 2; lines.userData.part = 'dig-cracks';
  parent.add(lines);
  const tiles = [];
  let count = 0;

  const same = (a, x, z) => Math.abs(a.x - x) < .5 && Math.abs(a.z - z) < .5;
  function blow(x, z, face) {
    let tile = tiles.find(t => same(t, x, z));
    if (!tile) {
      tile = {x, z, seed: ++count, cracks: [], idle: 0};
      tiles.push(tile);
      if (tiles.length > MAX_TILES) tiles.shift();
    }
    tile.idle = 0;
    if (Number.isFinite(face)) tile.face = face;
    if (tile.cracks.length < MAX_CRACKS) tile.cracks.push({k: tile.cracks.length, age: 0});
    return tile;
  }
  function message(text, x, z, face) {
    const kind = digMessage(text);
    if (!kind || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    if (kind === 'blow') return blow(x, z, face);
    for (let i = tiles.length - 1; i >= 0; i--) if (same(tiles[i], x, z)) tiles.splice(i, 1);
    return null;
  }

  function update(dt) {
    dt = Math.min(Math.max(dt || 0, 0), .1);
    let n = 0;
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i];
      t.idle += dt;
      if (t.idle >= HOLD + FADE) { tiles.splice(i, 1); continue; }
      const fade = 1 - clamp01((t.idle - HOLD) / FADE);
      for (const c of t.cracks) {
        c.age += dt;
        const pts = crackPath(t.seed, c.k), reach = crackReach(c.age);
        for (let s = 0; s < reach; s++) {
          for (let e = 0; e < 2; e++) {
            const p = pts[s + e];
            pos[n * 3] = t.x + p[0]; pos[n * 3 + 1] = .025; pos[n * 3 + 2] = t.z + p[1];
            // darker towards the tip, so the crack looks thin where it ends
            const g = .07 * fade * (1 - .5 * (s + e) / SEGS);
            col[n * 3] = g; col[n * 3 + 1] = g * .9; col[n * 3 + 2] = g * .8;
            n++;
          }
          if (t.face === undefined) continue;
          for (let e = 0; e < 2; e++) {
            const w = wallPoint(pts[s + e], t.face);
            pos[n * 3] = t.x + w.x; pos[n * 3 + 1] = w.y; pos[n * 3 + 2] = t.z + w.z;
            const g = .05 * fade * (1 - .5 * (s + e) / SEGS);
            col[n * 3] = g; col[n * 3 + 1] = g * .9; col[n * 3 + 2] = g * .8;
            n++;
          }
        }
      }
    }
    geo.setDrawRange(0, n);
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
    return {tiles: tiles.length, vertices: n};
  }
  const clear = () => { tiles.length = 0; update(0); };
  const dispose = () => { clear(); parent.remove(lines); geo.dispose(); lines.material.dispose(); };
  return {message, update, clear, dispose};
}
