// A living hem for robed figures whose robe is baked into one merged body mesh (so there is no
// hem part to swing). This moves the body's vertices instead, through one smooth field, so the
// alb, its torn points and anything hanging low over it (the chasuble's points, the stole's
// fringe) move together without tearing apart.
//
// Three things move the hem, more the lower a vertex is (nothing above `top`, fully at `bottom`):
//  - Trail: a soft, underdamped spring in the figure's own frame. When it glides off, the hem
//    drags behind and lifts a little; when it stops, the hem swings on past and settles back.
//  - Crawl: a slow, uneven ripple that creeps round the hem against the figure's facing, as if
//    something stirs underneath. It never stops while the figure lives.
//  - Flutter: the torn points at the very bottom twitch on their own, quicker and sharper.
// Dead, it all eases out and the rest shape is written back once. Stone (`a.stone`) holds.
//
// Shared body geometry is cloned per actor on first use, so other copies stay still; the clone
// is disposed with the actor (userData.dispose, which live.js's release calls).

// top: height (body space) where the sway starts; bottom: the hem's lowest edge (default 0), where
// it moves fully; lag: the most the hem trails (body units) at speed `sat`; freq/damp: the trail
// spring; crawl/flutter: amplitudes; flutterY: how far above `bottom` the points flutter.
// Pelias: the bearskin cloak's ragged hem hangs to the knee (.26) and the war-kilt's leather strips
// hang from the belt (.5) to about .35. Heavy fur swings slow and wide and barely lifts; the stir is
// a cold wind in the fur, not a crawl, and the strip ends and the hem's tatters flap with it.
// Charon: the river-murk robe falls from the rope girdle (.56) to the floor, soaked black and slimed
// at the hem. Waterlogged, it drags slow and heavy, barely overshoots and never lifts; standing, the
// Styx's slow current still laps round it, and the sodden points only twitch, as if dripping.
export const HEMS = {
  'dark one': {top: .42, lag: .045, sat: 1.2, freq: 6.5, damp: .28, lift: .3, crawl: .007, crawlHz: .21, flutter: .006, flutterY: .045},
  pelias: {top: .5, bottom: .26, lag: .05, sat: 1.4, freq: 4.2, damp: .32, lift: .15, crawl: .004, crawlHz: .13, flutter: .005, flutterY: .15},
  charon: {top: .5, lag: .04, sat: 1.2, freq: 3.6, damp: .45, lift: .04, crawl: .006, crawlHz: .09, flutter: .003, flutterY: .05},
};
// TELEPORT: a speed (world units/s) no glide reaches
const STEP = 1 / 120, MAX_DT = .1, EASE = 1.5, TELEPORT = 20, REST = 1e-4;

export const isHemSway = a => !!a && !a.asset && !!HEMS[a.kind] && !!a.body;

function bodyMesh(actor) {
  return actor.body.children.find(o => o.isMesh && o.userData.part === 'body') ?? null;
}

// The per-actor setup: the cloned geometry, its rest positions and, for each vertex that moves,
// its weight, its flutter weight and its angle round the body.
function setup(actor, P) {
  const mesh = bodyMesh(actor);
  if (!mesh?.geometry?.attributes?.position) return null;
  const geo = mesh.geometry.clone();
  mesh.geometry = geo;
  const prev = mesh.userData.dispose;
  mesh.userData.dispose = () => { prev?.(); geo.dispose(); };
  const p = geo.attributes.position, idx = [], w = [], f = [], ang = [], lo = P.bottom ?? 0;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y >= P.top) continue;
    const s = Math.min(1, (P.top - y) / (P.top - lo));
    idx.push(i); w.push(s * s);
    f.push(Math.max(0, Math.min(1, (lo + P.flutterY - y) / P.flutterY)));
    ang.push(Math.atan2(p.getX(i), p.getZ(i)));
  }
  const seed = Math.abs(Math.sin((actor.g.id || 1) * 12.9898)) * 43758.5453 % (Math.PI * 2);
  return {
    geo, rest: Float32Array.from(p.array), idx: Uint32Array.from(idx), w: Float32Array.from(w),
    f: Float32Array.from(f), ang: Float32Array.from(ang), seed,
    lx: 0, lz: 0, vx: 0, vz: 0, px: actor.g.position.x, pz: actor.g.position.z,
    life: 1, settled: false,
  };
}

// The hem's offsets at one frame, for a vertex at angle `a` with weights w (sway) and f (points).
export function hemOffset(P, st, a, w, f, t) {
  const ph = st.seed, life = st.life;
  const crawl = P.crawl * life * (Math.sin(3 * a + P.crawlHz * Math.PI * 2 * t + ph) * .6
    + Math.sin(5 * a - 1.7 * t + ph * 1.7) * .4);
  const flick = P.flutter * life * f * Math.sin(13 * a + 4.3 * t + ph) * Math.sin(2.1 * t + a * 3 + ph);
  const r = (crawl + flick) * w, sa = Math.sin(a), ca = Math.cos(a);
  const lag = Math.hypot(st.lx, st.lz);
  return {x: st.lx * w + sa * r, y: P.lift * lag * w + Math.abs(flick) * .5, z: st.lz * w + ca * r};
}

// Per frame, after the slide. Returns the actor's sway state, or null for other actors.
export function updateHemSway(actor, dt, t) {
  if (!isHemSway(actor)) return null;
  const P = HEMS[actor.kind];
  let st = actor.hemSway;
  if (st === undefined) st = actor.hemSway = setup(actor, P);
  if (!st || actor.stone) return st;
  dt = Number.isFinite(dt) ? Math.min(MAX_DT, Math.max(0, dt)) : 0;
  t = Number.isFinite(t) ? t : 0;
  const g = actor.g, dead = !!actor.actions?.dead;

  // velocity in the figure's own frame (+z forward)
  let fx = 0, fz = 0;
  if (dt > 0) {
    let vx = (g.position.x - st.px) / dt, vz = (g.position.z - st.pz) / dt;
    // a jump (a new level, a trapdoor) shouldn't fling the hem
    if (!(Math.hypot(vx, vz) <= TELEPORT)) vx = vz = 0;
    const yaw = g.rotation.y, sy = Math.sin(yaw), cy = Math.cos(yaw);
    fx = vx * cy - vz * sy; fz = vx * sy + vz * cy;
  }
  st.px = g.position.x; st.pz = g.position.z;
  const speed = Math.hypot(fx, fz), pull = dead || speed < 1e-6 ? 0 : P.lag * Math.tanh(speed / P.sat) / speed;
  const tx = -fx * pull, tz = -fz * pull, k = P.freq * P.freq, c = 2 * P.damp * P.freq;
  for (let left = dt; left > 1e-9; left -= STEP) {
    const h = Math.min(STEP, left);
    st.vx += (k * (tx - st.lx) - c * st.vx) * h; st.lx += st.vx * h;
    st.vz += (k * (tz - st.lz) - c * st.vz) * h; st.lz += st.vz * h;
  }
  const m = Math.hypot(st.lx, st.lz), cap = P.lag * 1.6;
  if (m > cap) { st.lx *= cap / m; st.lz *= cap / m; }
  st.life += ((dead ? 0 : 1) - st.life) * (1 - Math.exp(-EASE * dt));

  const quiet = dead && st.life < .01 && m < REST && Math.hypot(st.vx, st.vz) < REST;
  if (quiet && st.settled) return st;
  const pos = st.geo.attributes.position.array, rest = st.rest;
  for (let n = 0; n < st.idx.length; n++) {
    const j = st.idx[n] * 3;
    if (quiet) { pos[j] = rest[j]; pos[j + 1] = rest[j + 1]; pos[j + 2] = rest[j + 2]; continue; }
    const o = hemOffset(P, st, st.ang[n], st.w[n], st.f[n], t);
    pos[j] = rest[j] + o.x; pos[j + 1] = rest[j + 1] + o.y; pos[j + 2] = rest[j + 2] + o.z;
  }
  st.settled = quiet;
  st.geo.attributes.position.needsUpdate = true;
  return st;
}
