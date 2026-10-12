// An idle half-draw for the samurai (samurai.js). A samurai standing still now and then lets the
// sword hand rise a slow, patient hand's width as if to draw, holds it, and then snaps it back with
// a hard drop while the head turns an unhurried way to look at nothing. Walking, an action or death
// takes it back within a moment.
//
// Offsets only: arm and head rotations are added on top of whatever the gait and action layers
// wrote, and taken back first next frame, so nothing drifts.
export const RISE = .6, SNAP_BACK = .25, TURN = .3, LEN = 4, GAP_MIN = 10, GAP_SPAN = 10;
export const FIRST_MIN = 3, FIRST_SPAN = 5;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const draws = a => !!(a && !a.asset && a.kind === 'samurai' && a.head && a.arms?.length > 1 && a.body);

// The pose at progress u (0..1): rise, snap, turn, each 0..1. All exactly zero at both ends.
export function samuraiDrawPose(u) {
  if (!(u > 0) || !(u < 1)) return {rise: 0, snap: 0, turn: 0};
  const rise = smooth(u / .4) * (1 - smooth((u - .62) / .03));
  const snap = Math.exp(-(((u - .67) / .02) ** 2));
  const turn = smooth((u - .3) / .15) * (1 - smooth((u - .78) / .12));
  return {rise, snap, turn};
}

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateSamuraiDraw(actor, dt, t, busy) {
  if (!draws(actor)) return null;
  const st = actor.samuraiDraw || (actor.samuraiDraw = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {a: 0, y: 0}});
  const o = st.o, arms1 = actor.arms[1], head = actor.head;
  arms1.rotation.x -= o.a; head.rotation.y -= o.y;
  st.o = {a: 0, y: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = samuraiDrawPose(st.s), f = st.f;
  st.o = {a: (SNAP_BACK * p.snap - RISE * p.rise) * f, y: TURN * p.turn * f};
  arms1.rotation.x += st.o.a; head.rotation.y += st.o.y;
  return p;
}
