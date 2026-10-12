// A guard's idle sweep (soldier.js, watch.js). A soldier or watchman that stands still now and then
// checks the room: the head snaps hard to one side and holds, snaps across to the other and holds
// longer, and then the weapon arm hitches up a notch as the grip is shifted, as if something out
// there had been counted and found wanting. Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's yaw (rotation.y) and the weapon arm's lift (rotation.x) are added on top
// of whatever the gait and action layers wrote, and taken back first next frame, so nothing drifts.
export const SCAN = .6, HITCH = .22;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 5, GAP_SPAN = 8, LEN = 3;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const sweeps = a => !!(a && !a.asset && a.quirk === 'guard' && a.head && a.arms?.length > 1 && a.body);

// The sweep at progress u (0..1): {scan} -1..1 head yaw, {hitch} 0..1 the grip shift. Hard snaps
// (fast smoothsteps) to the left at .12, across to the right at .45, back to centre at .78; the
// grip hitches with the last snap. Both exactly zero at both ends.
export function sweepPose(u) {
  if (!(u > 0) || !(u < 1)) return {scan: 0, hitch: 0};
  const snap = (c, w = .03) => smooth((u - c) / w);
  const scan = -snap(.1) + 2 * snap(.45) - snap(.78);
  const hitch = snap(.74, .025) * (1 - snap(.92, .06));
  return {scan: Math.max(-1, Math.min(1, scan)), hitch};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateGuardSweep(actor, dt, t, busy) {
  if (!sweeps(actor)) return null;
  const st = actor.guardSweep || (actor.guardSweep = {seed: ((actor.g?.id ?? 1) * 30011) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {y: 0, a: 0}});
  const o = st.o, head = actor.head, arm = actor.arms[1];
  head.rotation.y -= o.y; arm.rotation.x -= o.a;
  st.o = {y: 0, a: 0};
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
  const p = sweepPose(st.s), f = st.f;
  st.o = {y: SCAN * p.scan * f, a: -HITCH * p.hitch * f};
  head.rotation.y += st.o.y; arm.rotation.x += st.o.a;
  return p;
}
