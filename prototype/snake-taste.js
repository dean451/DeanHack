// A snake's idle taste of the air (creatures.js snake()). A plain snake that lies still now and
// then lifts its head, cocks it to one side as if listening through the floor, lets the jaw hang
// slowly open, then snaps it shut with a jerk of the head. Walking, an action or death takes it
// back within a moment. Cobras (they have a hood, see cobra-rear.js) are left alone.
//
// Offsets only: the head's yaw (rotation.y) and roll (rotation.z), and the jaw's gape
// (rotation.x, positive opens) are added on top of whatever the action layer wrote, and taken back
// first next frame, so nothing drifts.
export const COCK = .5, TILT = .3, GAPE = .4;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 6, GAP_SPAN = 10, LEN = 3;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const tastes = a => !!(a && !a.asset && a.quirk === 'snake' && !a.hood && a.jaw?.parent && a.body);

// The taste at progress u (0..1): {cock} 0..1 head turned and tilted aside, {gape} 0..1 jaw open.
// The head cocks over slowly, the jaw sags open, then both snap shut in a few frames. Zero at both ends.
export function tastePose(u) {
  if (!(u > 0) || !(u < 1)) return {cock: 0, gape: 0};
  const cock = smooth(u / .3) * (1 - smooth((u - .78) / .05));
  const gape = smooth((u - .35) / .35) * (1 - smooth((u - .74) / .03));
  return {cock, gape};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or acts.
export function updateSnakeTaste(actor, dt, t, busy) {
  if (!tastes(actor)) return null;
  const st = actor.snakeTaste || (actor.snakeTaste = {seed: ((actor.g?.id ?? 1) * 2909) % 2147483647 || 1, wait: 0, s: null, f: 0, side: 1, o: {y: 0, z: 0, g: 0}});
  const o = st.o, jaw = actor.jaw, head = jaw.parent;
  head.rotation.y -= o.y; head.rotation.z -= o.z; jaw.rotation.x -= o.g;
  st.o = {y: 0, z: 0, g: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.side = rand(st) < .5 ? -1 : 1; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = tastePose(st.s), f = st.f;
  st.o = {y: st.side * COCK * p.cock * f, z: st.side * TILT * p.cock * f, g: GAPE * p.gape * f};
  head.rotation.y += st.o.y; head.rotation.z += st.o.z; jaw.rotation.x += st.o.g;
  return p;
}
