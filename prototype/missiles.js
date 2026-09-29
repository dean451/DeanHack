// Magic missiles (a wand of magic missile, the spell, or a "blast of missiles" breath).
// NetHack draws them with the same beam glyphs as any ray, so rays.js used to show a thin
// blue line. Here they are a volley of glowing arcane darts instead: a few bolts chase
// each other along the cells the beam drew, weaving round the path in a loose helix, each
// shedding a trail of fading motes and a few twinkles. They bank off walls where the beam
// bounces, and where the volley ends each dart pops in a small starburst. rays.js still
// draws the beam, but faintly, as a shimmering wake.
//
// missilePath(), missileFrame() are pure, so they can be tested without a renderer;
// rays.js draws what missileFrame() returns.

// Darts in a volley, how far (ms) each one lags the one in front, and how far they weave.
export const VOLLEY = 5;
export const LAG_MS = 24;
export const WEAVE = .11;
// Radians per ms the weave turns.
export const SPIN = .018;
// Trail motes per dart, spaced this far apart in time (ms).
export const TRAIL = 7;
export const TRAIL_STEP_MS = 13;
// How long a dart's starburst lasts where it ends (ms), and its sparks.
export const POP_MS = 300;
export const POP_SPARKS = 8;
// Twinkles left hanging along the path, and how long they live (ms).
export const TWINKLES_PER_CELL = 2;
export const TWINKLE_MS = 380;
// Chest height, as rays.js.
const Y = .5;

export const MISSILE_LOOK = {core: 0xf4f7ff, glow: 0x6d8cff, trail: 0x8fa6ff, deep: 0x3a3fc0, spark: 0xcfdcff};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
export const isMissile = effect => effect?.kind === 'zap' && effect.zap === 'magic missile';

// The volleys in a timeline: one path per magic-missile beam, as waypoints [{x, z, t}] in
// the order the cells were drawn. A cell drawn twice in a row is where the beam hit a wall
// and bounced; that waypoint moves out to the wall edge so the darts touch it and turn.
export function missilePaths(timeline) {
  const runs = new Map();
  for (const s of timeline?.sprites ?? []) {
    if (!isMissile(s.effect) || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
    if (!runs.has(s.seq)) runs.set(s.seq, []);
    runs.get(s.seq).push(s);
  }
  const out = [];
  for (const run of runs.values()) {
    run.sort((a, b) => a.from - b.from);
    const pts = [];
    for (let i = 0; i < run.length; i++) {
      const s = run[i], prev = run[i - 1], before = run[i - 2];
      if (prev && prev.x === s.x && prev.z === s.z) {
        const ix = before ? Math.sign(prev.x - before.x) : 0, iz = before ? Math.sign(prev.z - before.z) : 0;
        pts.push({x: s.x + ix * .45, z: s.z + iz * .45, t: s.from});
      } else pts.push({x: s.x, z: s.z, t: s.from});
    }
    const last = run[run.length - 1];
    out.push({pts, end: last.from + Math.min(40, Math.max(0, last.until - last.from))});
  }
  return out;
}

// Where the path's head is at time tau: {x, z, dx, dz} (dx/dz the unit heading), or null
// before it starts or after it ends.
export function pathAt(path, tau) {
  const p = path.pts;
  if (!p.length || tau < p[0].t || tau > path.end) return null;
  let i = 0;
  while (i < p.length - 1 && p[i + 1].t <= tau) i++;
  const a = p[i], b = p[i + 1];
  if (!b) {
    // Past the last cell: carry on the last heading until the end.
    const h = p[i - 1] ?? a;
    const dx = a.x - h.x, dz = a.z - h.z, L = Math.hypot(dx, dz) || 1;
    const k = clamp01((tau - a.t) / 50) * .4;
    return {x: a.x + dx / L * k, z: a.z + dz / L * k, dx: dx / L || 1, dz: dz / L};
  }
  const k = b.t > a.t ? (tau - a.t) / (b.t - a.t) : 1;
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
  return {x: a.x + dx * k, z: a.z + dz * k, dx: dx / L || 1, dz: dz / L};
}

// One dart's position at timeline time t: {x, y, z, yaw, dx, dz} or null. Dart j follows the
// head j*LAG_MS behind, circling it in its own phase; the weave opens up after launch.
function dartAt(path, j, t) {
  const tau = t - j * LAG_MS;
  const h = pathAt(path, tau);
  if (!h) return null;
  const open = clamp01((tau - path.pts[0].t) / 90);
  const ang = tau * SPIN + j * Math.PI * 2 / VOLLEY;
  const r = WEAVE * open * (.8 + .4 * hash(j, 9));
  const sx = -h.dz, sz = h.dx;
  return {x: h.x + sx * Math.cos(ang) * r, y: Y + Math.sin(ang) * r, z: h.z + sz * Math.cos(ang) * r,
    yaw: Math.atan2(h.dz, h.dx), dx: h.dx, dz: h.dz};
}

// Everything lit at time t for one path: {darts, pops, motes}.
// dart: {x, y, z, yaw, size}; pop: {x, y, z, size, alpha} (a swelling star); mote: {x, y, z,
// color, alpha} (trail motes, twinkles and pop sparks, for a point cloud).
export function missileFrame(path, t) {
  const darts = [], pops = [], motes = [];
  if (!path?.pts?.length) return {darts, pops, motes};
  for (let j = 0; j < VOLLEY; j++) {
    const d = dartAt(path, j, t);
    // Each dart shimmers a little as it flies.
    if (d) darts.push({...d, size: .9 + .2 * Math.sin(t * .09 + j * 2.1)});
    for (let k = 1; k <= TRAIL; k++) {
      const m = dartAt(path, j, t - k * TRAIL_STEP_MS);
      if (!m) continue;
      const u = k / (TRAIL + 1);
      motes.push({x: m.x, y: m.y, z: m.z, color: u < .5 ? MISSILE_LOOK.trail : MISSILE_LOOK.deep, alpha: (1 - u) * (d ? .9 : .5)});
    }
    // The pop where this dart ends.
    const endT = path.end + j * LAG_MS, age = t - endT;
    if (age >= 0 && age < POP_MS) {
      const e = dartAt(path, j, endT);
      if (e) {
        const u = age / POP_MS;
        pops.push({x: e.x, y: e.y, z: e.z, size: .08 + .3 * Math.sqrt(u), alpha: (1 - u) * (1 - u)});
        const s = age / 1000;
        for (let i = 0; i < POP_SPARKS; i++) {
          const th = hash(j, i, 31) * Math.PI * 2, ph = (hash(j, i, 32) - .3) * 1.4;
          const v = 1 + 1.4 * hash(j, i, 33);
          motes.push({x: e.x + Math.cos(th) * Math.cos(ph) * v * s, y: Math.max(.02, e.y + Math.sin(ph) * v * s - 3 * s * s),
            z: e.z + Math.sin(th) * Math.cos(ph) * v * s, color: MISSILE_LOOK.spark, alpha: 1 - u});
        }
      }
    }
  }
  // Twinkles hang where the volley passed, blink and go out.
  for (let c = 0; c < path.pts.length; c++) {
    const p = path.pts[c];
    for (let i = 0; i < TWINKLES_PER_CELL; i++) {
      const born = p.t + hash(c, i, 41) * 60, age = t - born;
      if (age < 0 || age >= TWINKLE_MS) continue;
      const u = age / TWINKLE_MS;
      const blink = .55 + .45 * Math.sin(age * .06 + hash(c, i, 42) * 6);
      motes.push({x: p.x + (hash(c, i, 43) - .5) * .5, y: Y + (hash(c, i, 44) - .5) * .35 - .1 * u,
        z: p.z + (hash(c, i, 45) - .5) * .5, color: MISSILE_LOOK.spark, alpha: (1 - u) * blink * .8});
    }
  }
  return {darts, pops, motes};
}

// How long after the timeline starts the last of a path's effects is gone (ms).
export const missileTail = path => path.end + (VOLLEY - 1) * LAG_MS + Math.max(POP_MS, TWINKLE_MS);
