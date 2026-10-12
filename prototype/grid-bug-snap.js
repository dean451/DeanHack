// A grid bug's idle tic (grid-bug.js, quirk 'gridbug'). The creature can only think in right angles,
// and it shows: a standing grid bug now and then swings its whole body aside in hard, stepped snaps
// (never a smooth turn), holds, snaps the other way past where it began, and settles back in a last
// snap. Every snap sets the legs buzzing for a moment, the way a bad relay chatters. Walking, an
// action or death takes it back within a moment.
//
// Offsets only: the body's yaw (rotation.y) and each leg's pitch (rotation.x) are added on top of
// what gait.js and the action layer wrote, and taken back first next frame, so nothing drifts.
export const SNAP_YAW = .62, BUZZ = .3;
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 7, GAP_SPAN = 8, LEN = 1.8;
const SNAP = 1e-3, FADE_OUT = 14, BUZZ_HZ = 38;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

export const snaps = a => !!(a && !a.asset && a.quirk === 'gridbug' && a.body && a.legs?.length >= 6);

// Edges of the stepped turn: progress where each snap lands (all hard, a few hundredths wide).
const EDGES = [[.1, 1], [.4, -2], [.62, 1.25], [.88, -.25]];

// The tic at progress u (0..1): {yaw} -1..1 stepped body turn, {buzz} 0..1 leg chatter that spikes
// at each snap and dies away. Both zero at both ends.
export function snapPose(u) {
  if (!(u > 0) || !(u < 1)) return {yaw: 0, buzz: 0};
  let yaw = 0, buzz = 0;
  for (const [e, step] of EDGES) {
    yaw += step * clamp01((u - e) / .025);
    if (u > e) buzz = Math.max(buzz, Math.exp(-(u - e) / .035));
  }
  return {yaw: Math.max(-1, Math.min(1, yaw)), buzz: clamp01(buzz)};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateGridBugSnap(actor, dt, t, busy) {
  if (!snaps(actor)) return null;
  const st = actor.gridBugSnap || (actor.gridBugSnap = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {y: 0, l: actor.legs.map(() => 0)}});
  const body = actor.body, legs = actor.legs;
  body.rotation.y -= st.o.y; legs.forEach((l, i) => { l.rotation.x -= st.o.l[i]; });
  st.o = {y: 0, l: legs.map(() => 0)};
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
  const p = snapPose(st.s), f = st.f;
  st.o.y = SNAP_YAW * p.yaw * f;
  legs.forEach((l, i) => { st.o.l[i] = BUZZ * p.buzz * f * Math.sin(t * BUZZ_HZ + i * 2.1); });
  body.rotation.y += st.o.y; legs.forEach((l, i) => { l.rotation.x += st.o.l[i]; });
  return p;
}
