// A skeleton's idle skull-tap (skeleton.js). A skeleton standing still now and then raises its free
// hand to the cranium and raps it three times, the last knock harder, as if checking for the thing
// that used to be in there, then the head tilts to listen and the hand drops. Walking, an action or
// death takes it back within a moment.
//
// Offsets only: the free (left) arm's lift (rotation.x) and the head's roll (rotation.z) and pitch
// (rotation.x) are added on top of whatever the gait and action layers wrote, and taken back first
// next frame, so nothing drifts.
export const LIFT = 1.9, KNOCK = .18, LISTEN = .35, NOD = .1;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 8, GAP_SPAN = 9, LEN = 3.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const taps = a => !!(a && !a.asset && a.kind === 'skeleton' && a.head && a.arms?.length > 1 && a.body);

// The tap at progress u (0..1): {lift} 0..1 the hand raised, {knock} 0..1 the three raps (the last
// hardest), {listen} 0..1 the head cocked after. All exactly zero at both ends.
export function tapPose(u) {
  if (!(u > 0) || !(u < 1)) return {lift: 0, knock: 0, listen: 0};
  const lift = smooth(u / .15) * (1 - smooth((u - .72) / .12));
  const bump = (c, w = .015) => Math.exp(-(((u - c) / w) ** 2));
  const knock = Math.min(1, .6 * bump(.3) + .6 * bump(.4) + bump(.5, .02));
  const listen = smooth((u - .55) / .06) * (1 - smooth((u - .9) / .08));
  return {lift, knock, listen};
}

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateSkeletonTap(actor, dt, t, busy) {
  if (!taps(actor)) return null;
  const st = actor.skeletonTap || (actor.skeletonTap = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {a: 0, z: 0, x: 0}});
  const o = st.o, head = actor.head, arm = actor.arms[0];
  arm.rotation.x -= o.a; head.rotation.z -= o.z; head.rotation.x -= o.x;
  st.o = {a: 0, z: 0, x: 0};
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
  const p = tapPose(st.s), f = st.f;
  // a negative lift swings the arm forward and up; each knock is a short dip back toward the skull
  st.o = {a: -(LIFT * p.lift - KNOCK * p.knock * p.lift) * f, z: LISTEN * p.listen * f, x: NOD * p.listen * f};
  arm.rotation.x += st.o.a; head.rotation.z += st.o.z; head.rotation.x += st.o.x;
  return p;
}
