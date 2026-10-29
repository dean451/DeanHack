// Environmental storytelling: small set-dressing on the floor next to a feature, hinting at what
// happened there. It is drawn only from what the frame already says about the level, never from
// game state the hero could not see:
//   scorch   a fire trap (the cell's trap name, or its '^' in orange): soot streaks fan out over
//            the floor squares round it, pointing away from the trap
//   bones    a pit, spiked pit, hole or trap door: the one who nearly climbed out lies on one floor
//            square beside it, a skull and a few bones at the lip side, on a grime smudge
//   gouges   a broken door (`door: 'broken'`): claw gouges score the floor on both sides of the
//            doorway, running at the threshold, deeper on one side
//   stain    a fountain: a dried mineral tide-mark where the water slopped over onto one or two
//            of the floor squares beside it
// Everything is seeded from the cell and the level, so it never moves or flickers between frames,
// and it stays near the edge of a square, flat on the floor or very low, so it never hides the
// tile, an item or a monster. A feature is remembered once seen, so a monster standing on a trap
// does not wipe its scorch; it is dropped only when its square shows something else, uncovered.
// Cost: all decals are one merged, vertex-coloured mesh and all bones a second one, rebuilt only
// when the set of dressed features or the floor round them changes; capped, no lights.
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {trapKind} from './trap.js';
import {boneGeometries} from './bone-shards.js';

export const STORY_KINDS = ['scorch', 'bones', 'gouges', 'stain'];
// Caps: features dressed, flat decal pieces and bones, whatever the level holds.
export const SOURCE_MAX = 32, DECAL_MAX = 160, BONE_MAX = 24;
// Decals sit between the floor slab's top (-.03) and the fog plane (.012), so a remembered square's
// fog dims them like the rest of the tile.
export const DECAL_Y = .004;

// Deterministic pseudo-random in [0,1) from a cell, the level and a salt.
export function storyHash(x, z, level = 0, n = 0) {
  const s = Math.sin(x * 127.1 + z * 311.7 + level * 17.13 + n * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
// A level key ("branch:depth") as a small number for the seed.
export function levelSeed(key) {
  let h = 0;
  for (const ch of String(key ?? '')) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h;
}

const PITS = new Set(['pit', 'barepit', 'hatch', 'hole']);
// What story a cell tells, or null. Only a cell whose own glyph shows (nothing on it) can say.
export function storyKind(cell) {
  if (!cell) return null;
  if (cell.terrain === 'fountain') return 'stain';
  if (cell.door === 'broken') return 'gouges';
  if (cell.terrain === 'feature') {
    const trap = trapKind(cell.symbol, cell.color, cell.trap);
    if (trap === 'fire') return 'scorch';
    if (PITS.has(trap)) return 'bones';
  }
  return null;
}
// A square dressing may lie on: plain floor or corridor, not a doorway with a door.
const isFloor = c => !!c && c.terrain === 'floor' && !c.door;
const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const N8 = [...N4, [1, -1], [1, 1], [-1, 1], [-1, -1]];
const WALLISH = new Set(['wall', 'bars', 'door']);

// The pieces one feature lays down, in map coordinates: decals {kind, tris:[x,z,...], cols:[r,g,b,a,...]}
// and bones {shape, x, z, rot, tilt, s}. `at(dx,dz)` returns the neighbouring cell or undefined.
export function piecesFor(source, at, level = 0) {
  const {kind, x, z} = source, decals = [], bones = [];
  const r = n => storyHash(x, z, level, n);
  if (kind === 'scorch') {
    N8.forEach(([dx, dz], i) => {
      const n = at(dx, dz);
      if (!isFloor(n) || r(i) < .2) return; // a few squares were spared
      const diag = dx && dz, ux = dx / Math.hypot(dx, dz), uz = dz / Math.hypot(dx, dz), out = Math.atan2(uz, ux);
      const seed = x * 7 + z + i * 13;
      if (!diag) {
        // a soft smudge of soot along the shared edge, where the blast licked over it
        const side = (r(i + 80) - .5) * .2;
        decals.push(blot(x + dx * .62 - uz * side, z + dz * .62 + ux * side, .3 + r(i + 90) * .06, SOOT, .5, SOOT, .26, seed, level, {sx: .45, angle: out}));
      }
      const streaks = diag ? 1 : 2 + (r(i + 20) > .5 ? 1 : 0), len = (diag ? .2 : .3) + r(i + 10) * .14;
      for (let k = 0; k < streaks; k++) {
        const side = streaks === 1 ? (r(i + 30) - .5) * .1 : (k / (streaks - 1) - .5) * .5 + (r(i + 40 + k) - .5) * .1;
        // from the edge (or corner) of the neighbour square nearest the trap, offset along that edge
        const bx = x + dx * .54 - uz * side, bz = z + dz * .54 + ux * side;
        const a = out + (r(i + 50 + k) - .5) * (streaks === 1 ? .15 : .5) + side * .6; // fanning out round the straight-out line
        decals.push(streak(bx, bz, Math.cos(a), Math.sin(a), len * (.75 + r(i + 60 + k) * .35), .14 + r(i + 70 + k) * .08, SOOT, .55, seed + k, level, 1.4));
      }
    });
  } else if (kind === 'bones') {
    // One floor square beside the pit, an orthogonal one if there is any.
    const pick = list => list.length ? list[Math.floor(r(1) * list.length) % list.length] : null;
    const four = N4.filter(([dx, dz]) => isFloor(at(dx, dz))), eight = N8.slice(4).filter(([dx, dz]) => isFloor(at(dx, dz)));
    const d = pick(four) || pick(eight);
    if (d) {
      const [dx, dz] = d, ux = dx / Math.hypot(dx, dz), uz = dz / Math.hypot(dx, dz);
      const side = (r(2) - .5) * .4;
      const cx = x + dx * .72 - uz * side, cz = z + dz * .72 + ux * side; // just inside the lip side
      decals.push(blot(cx, cz, .26 + r(3) * .05, GRIME, .55, GRIME, .4, x * 3 + z * 5, level, {sx: .55, angle: Math.atan2(uz, ux)}));
      const toward = Math.atan2(-dx, -dz); // the skull faces the pit it fell back from
      const skLat = (r(7) > .5 ? 1 : -1) * .17;
      bones.push({shape: 'skull', x: cx - ux * .05 - uz * skLat, z: cz - uz * .05 + ux * skLat, rot: toward + (r(4) - .5) * .8, tilt: (r(5) - .5) * .2, s: .17});
      const n = 2 + (r(6) > .45 ? 1 : 0), shapes = ['long', 'rib', 'splinter', 'vertebra'];
      for (let k = 0; k < n; k++) {
        // strewn along the lip, not out over the square
        const lat = (k - (n - 1) / 2) * .11 - skLat * .45 + (r(10 + k) - .5) * .05, rad = (r(20 + k) - .5) * .1;
        bones.push({shape: shapes[Math.floor(r(30 + k) * shapes.length) % shapes.length], x: cx - uz * lat + ux * rad, z: cz + ux * lat + uz * rad,
          rot: r(40 + k) * Math.PI * 2, tilt: (r(50 + k) - .5) * .24, s: .12 + r(60 + k) * .04});
      }
    }
  } else if (kind === 'gouges') {
    // The passage runs across the wall: walls left and right mean it runs north-south.
    const wall = (dx, dz) => WALLISH.has(at(dx, dz)?.terrain) ? 1 : 0;
    const alongX = wall(-1, 0) + wall(1, 0), alongZ = wall(0, -1) + wall(0, 1);
    if (alongX !== alongZ) {
      const ax = alongX > alongZ ? 0 : 1, az = alongX > alongZ ? 1 : 0;
      const deep = r(1) < .5 ? 1 : -1; // the side the thing came from clawed hardest
      for (const s of [1, -1]) {
        const dx = ax * s, dz = az * s;
        if (!isFloor(at(dx, dz))) continue;
        const strokes = s === deep ? 4 : 2 + (r(2) > .5 ? 1 : 0);
        const slant = (r(3 + s) - .5) * .7, off = (r(5 + s) - .5) * .3;
        const ca = Math.atan2(dz, dx) + slant; // run away from the door, slanted
        const bend = (r(7 + s) - .5) * .1;
        for (let k = 0; k < strokes; k++) {
          // one rake of a clawed hand: the strokes fan a little and curve together, staggered
          const lat = (k - (strokes - 1) / 2) * .055 + off, lead = r(20 + k + s * 5) * .06;
          const fa = ca + (k - (strokes - 1) / 2) * .05, fx = Math.cos(fa), fz = Math.sin(fa);
          const bx = x + dx * .55 + az * lat + fx * lead, bz = z + dz * .55 + ax * lat + fz * lead;
          const len = (s === deep ? .26 : .18) + r(10 + k + s * 5) * .1;
          decals.push(streak(bx, bz, fx, fz, len, .028, GROOVE, .82, x * 11 + z * 3 + k + s * 7, level, .2, bend));
          // the scraped stone catches the light along one lip of the groove
          decals.push(streak(bx - fz * .017, bz + fx * .017, fx, fz, len * .9, .012, LIP, .4, x * 13 + z + k + s * 9, level, .2, bend));
        }
      }
    }
  } else if (kind === 'stain') {
    const four = N4.filter(([dx, dz]) => isFloor(at(dx, dz)));
    const count = Math.min(four.length, 1 + (r(1) > .55 ? 1 : 0));
    const start = Math.floor(r(2) * Math.max(1, four.length));
    for (let k = 0; k < count; k++) {
      const [dx, dz] = four[(start + k) % four.length];
      const ux = dx, uz = dz, side = (r(3 + k) - .5) * .35;
      const cx = x + dx * .64 - uz * side, cz = z + dz * .64 + ux * side;
      decals.push(blot(cx, cz, .2 + r(5 + k) * .07, DAMP, .3, CHALK, .5, x * 5 + z * 7 + k, level, {sx: .7, angle: Math.atan2(uz, ux)}));
    }
  }
  return {decals, bones};
}

const SOOT = [.045, .032, .024], GRIME = [.05, .04, .03], GROOVE = [.04, .035, .03], LIP = [.62, .6, .55];
const DAMP = [.16, .19, .17], CHALK = [.56, .58, .5];

// A ragged streak (soot, or a gouge) from (bx,bz) along (ux,uz): a quad strip tapering to a point, its alpha
// fading toward the tip. `wobble` scales the side-to-side jitter.
function streak(bx, bz, ux, uz, len, width, color, alpha, seed, level, wobble = 1, bend = 0) {
  const tris = [], cols = [], SEG = 5, px = -uz, pz = ux;
  const pts = [];
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG, w = width * (1 - t * .92) * (.8 + storyHash(seed, i, level, 1) * .4) / 2;
    const j = (storyHash(seed, i, level, 2) - .5) * .05 * wobble * t + bend * t * t;
    const cx = bx + ux * len * t + px * j, cz = bz + uz * len * t + pz * j;
    pts.push([cx + px * w, cz + pz * w, cx - px * w, cz - pz * w, alpha * (1 - t * t)]);
  }
  for (let i = 0; i < SEG; i++) {
    const [ax, az, bx2, bz2, a0] = pts[i], [cx, cz, dx, dz, a1] = pts[i + 1];
    tris.push(ax, az, bx2, bz2, cx, cz, bx2, bz2, dx, dz, cx, cz);
    for (const a of [a0, a0, a1, a0, a1, a1]) cols.push(...color, a);
  }
  return {kind: 'streak', tris, cols};
}
// A lobed blot: a centre colour fading out through a rim colour, so a stain dries to a ring.
function blot(cx, cz, rad, inner, innerA, rim, rimA, seed, level, {sx = 1, angle = 0} = {}) {
  const tris = [], cols = [], SIDES = 18, ring = [];
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const p1 = storyHash(seed, 1, level, 3) * 6.283, p2 = storyHash(seed, 2, level, 3) * 6.283;
  for (let i = 0; i < SIDES; i++) {
    const a = i / SIDES * Math.PI * 2, k = .8 + .14 * Math.sin(2 * a + p1) + .08 * Math.sin(3 * a + p2);
    const lx = Math.cos(a) * rad * k * sx, lz = Math.sin(a) * rad * k;
    ring.push([cx + lx * ca - lz * sa, cz + lx * sa + lz * ca]);
  }
  const mid = ring.map(([x, z]) => [cx + (x - cx) * .78, cz + (z - cz) * .78]);
  for (let i = 0; i < SIDES; i++) {
    const j = (i + 1) % SIDES;
    tris.push(cx, cz, mid[i][0], mid[i][1], mid[j][0], mid[j][1]);
    cols.push(...inner, innerA, ...inner, innerA * .8, ...inner, innerA * .8);
    tris.push(mid[i][0], mid[i][1], ring[i][0], ring[i][1], ring[j][0], ring[j][1], mid[i][0], mid[i][1], ring[j][0], ring[j][1], mid[j][0], mid[j][1]);
    cols.push(...rim, rimA, ...rim, 0, ...rim, 0, ...rim, rimA, ...rim, 0, ...rim, rimA);
  }
  return {kind: 'blot', tris, cols};
}

// Plans the dressing for a set of features: the pieces in a stable order, cut to the caps.
// `sources` is [{kind,x,z}], `cellAt(x,z)` the frame's cell there.
export function planStory(sources, cellAt, level = 0) {
  const sorted = [...sources].sort((a, b) => a.z - b.z || a.x - b.x).slice(0, SOURCE_MAX);
  const decals = [], bones = [];
  for (const s of sorted) {
    const p = piecesFor(s, (dx, dz) => cellAt(s.x + dx, s.z + dz), level);
    for (const d of p.decals) if (decals.length < DECAL_MAX) decals.push(d);
    for (const b of p.bones) if (bones.length < BONE_MAX) bones.push(b);
  }
  return {decals, bones};
}

export function createEnvStory(THREE, parent) {
  const root = new THREE.Group();root.name = 'EnvStory';parent.add(root);
  const decalMaterial = new THREE.MeshStandardMaterial({vertexColors: true, transparent: true, depthWrite: false, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2});
  const boneMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .72, metalness: 0});
  const sources = new Map(); // "x,z" -> {kind,x,z}, remembered across frames
  let level = null, seed = 0, signature = '', decalMesh = null, boneMesh = null, planned = {decals: [], bones: []};
  const dropMeshes = () => {
    for (const m of [decalMesh, boneMesh]) if (m) { root.remove(m); m.geometry.dispose(); }
    decalMesh = boneMesh = null;
  };
  function build(plan) {
    dropMeshes();planned = plan;
    if (plan.decals.length) {
      const pos = [], col = [];
      for (const d of plan.decals) {
        for (let i = 0; i < d.tris.length; i += 2) pos.push(d.tris[i], DECAL_Y, d.tris[i + 1]);
        col.push(...d.cols);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
      // Flat on the floor, the triangles wind either way: draw both sides so none is culled.
      decalMaterial.side = THREE.DoubleSide;
      decalMesh = new THREE.Mesh(g, decalMaterial);decalMesh.name = 'EnvStoryDecals';decalMesh.renderOrder = 1;decalMesh.receiveShadow = true;
      root.add(decalMesh);
    }
    if (plan.bones.length) {
      const shapes = boneGeometries(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const parts = plan.bones.map(b => {
        const g = shapes[b.shape].clone();
        e.set(b.tilt, b.rot, b.tilt * .7);q.setFromEuler(e);
        m.compose(new THREE.Vector3(b.x, -.024, b.z), q, new THREE.Vector3(b.s, b.s, b.s));
        return g.applyMatrix4(m);
      });
      const g = mergeGeometries(parts);parts.forEach(p => p.dispose());
      boneMesh = new THREE.Mesh(g, boneMat);boneMesh.name = 'EnvStoryBones';boneMesh.receiveShadow = true;
      root.add(boneMesh);
    }
  }
  // Reads one frame: remembers the features shown, and rebuilds when what is dressed changed.
  function frame(f, origin) {
    if (!f || !Array.isArray(f.cells)) return;
    const key = `${f.branch}:${f.depth}`;
    if (key !== level) { clear();level = key;seed = levelSeed(key); }
    const byId = new Map();
    for (const c of f.cells) byId.set(`${c.x},${c.z}`, c);
    for (const c of f.cells) {
      if (c.terrain === 'unknown') continue;
      const id = `${c.x},${c.z}`, kind = c.kind === 'terrain' || c.kind == null ? storyKind(c) : null;
      if (kind) sources.set(id, {kind, x: c.x, z: c.z});
      // A fountain still says so under an occupant; anything else is judged only when uncovered.
      else if (sources.has(id) && (c.kind === 'terrain' || c.kind == null || (sources.get(id).kind === 'stain' && c.terrain !== 'fountain'))) sources.delete(id);
    }
    const cellAt = (x, z) => byId.get(`${x},${z}`);
    // What the plan depends on: the features and which squares round them are floor.
    let sig = '';
    for (const s of [...sources.values()].sort((a, b) => a.z - b.z || a.x - b.x)) {
      sig += `${s.kind}@${s.x},${s.z}:`;
      for (const [dx, dz] of N8) { const n = cellAt(s.x + dx, s.z + dz); sig += isFloor(n) ? 'f' : WALLISH.has(n?.terrain) ? 'w' : '.'; }
      sig += ';';
    }
    if (sig !== signature) { signature = sig;build(planStory([...sources.values()], cellAt, seed)); }
    if (origin) root.position.set(-origin.x, 0, -origin.z);
  }
  function clear() { dropMeshes();sources.clear();signature = '';level = null;planned = {decals: [], bones: []}; }
  return {frame, clear, root, sources: () => [...sources.values()], plan: () => planned};
}
