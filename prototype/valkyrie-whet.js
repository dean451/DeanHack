// An idle edge-test for the valkyrie (valkyrie.js). A valkyrie standing still now and then dips her
// head to the blade, lifts the sword arm a hand's width and draws it twice across an unseen thumb
// in two short, hard jerks, and then her head snaps up and round to the north, as if the edge had
// told her something. Walking, an action or death takes it back within a moment.
//
// Offsets only: the sword arm's lift (rotation.x) and the head's pitch (rotation.x) and yaw
// (rotation.y) are added on top of whatever the gait and action layers wrote, and taken back first
// next frame, so nothing drifts.
export const LIFT = .5, JERK = .18, DIP = .35, TURN = .55, LEN = 3.6, GAP_MIN = 9, GAP_SPAN = 11;
export const FIRST_MIN = 4, FIRST_SPAN = 6;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const whets = a => !!(a && !a.asset && a.kind === 'valkyrie' && a.head && a.arms?.length > 1 && a.body);

// The pose at progress u (0..1): lift, jerk, dip, turn, each 0..1. All exactly zero at both ends.
export function valkyrieWhetPose(u) {
  if (!(u > 0) || !(u < 1)) return {lift: 0, jerk: 0, dip: 0, turn: 0};
  const lift = smooth(u / .25) * (1 - smooth((u - .66) / .06));
  const jerk = Math.exp(-(((u - .4) / .018) ** 2)) + Math.exp(-(((u - .5) / .018) ** 2));
  const dip = smooth(u / .2) * (1 - smooth((u - .6) / .05));
  const turn = smooth((u - .64) / .04) * (1 - smooth((u - .84) / .1));
  return {lift, jerk: Math.min(1, jerk), dip, turn};
}

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateValkyrieWhet(actor, dt, t, busy) {
  if (!whets(actor)) return null;
  const st = actor.valkyrieWhet || (actor.valkyrieWhet = {seed: ((actor.g?.id ?? 1) * 7019) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {a: 0, x: 0, y: 0}});
  const o = st.o, arm = actor.arms[1], head = actor.head;
  arm.rotation.x -= o.a; head.rotation.x -= o.x; head.rotation.y -= o.y;
  st.o = {a: 0, x: 0, y: 0};
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
  const p = valkyrieWhetPose(st.s), f = st.f;
  st.o = {a: -(LIFT * p.lift - JERK * p.jerk * p.lift) * f, x: DIP * p.dip * f, y: TURN * p.turn * f};
  arm.rotation.x += st.o.a; head.rotation.x += st.o.x; head.rotation.y += st.o.y;
  return p;
}
