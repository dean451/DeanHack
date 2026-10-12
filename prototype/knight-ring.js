// An idle shield-check for the knight (knight.js). A knight standing still now and then heaves the
// shield arm up and drops it, twice, the head cocked to hear it ring, and the third time the arm
// hangs up too long and the head snaps straight, as if the shield had answered back. Walking, an
// action or death takes it back within a moment.
//
// Offsets only: arm and head rotations are added on top of whatever the gait and action layers
// wrote, and taken back first next frame, so nothing drifts.
export const HEAVE = .8, DROP = .3, COCK = .22, START = .2, LEN = 3.6, GAP_MIN = 9, GAP_SPAN = 9;
export const FIRST_MIN = 3, FIRST_SPAN = 5;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const rings = a => !!(a && !a.asset && a.kind === 'knight' && a.head && a.arms?.length > 1 && a.body);

// The pose at progress u (0..1): heave, drop, cock, start, each 0..1. All exactly zero at both ends.
export function knightRingPose(u) {
  if (!(u > 0) || !(u < 1)) return {heave: 0, drop: 0, cock: 0, start: 0};
  const heave = smooth(u / .1) * (1 - smooth((u - .84) / .1));
  const bump = (c, w = .02) => Math.exp(-(((u - c) / w) ** 2));
  const drop = Math.min(1, bump(.3) + bump(.46) + bump(.7, .03));
  const cock = smooth((u - .12) / .1) * (1 - smooth((u - .68) / .04));
  const start = smooth((u - .68) / .04) * (1 - smooth((u - .86) / .08));
  return {heave, drop, cock, start};
}

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateKnightRing(actor, dt, t, busy) {
  if (!rings(actor)) return null;
  const st = actor.knightRing || (actor.knightRing = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {a: 0, c: 0, h: 0}});
  const o = st.o, arms0 = actor.arms[0], head = actor.head;
  arms0.rotation.x -= o.a; head.rotation.z -= o.c; head.rotation.x -= o.h;
  st.o = {a: 0, c: 0, h: 0};
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
  const p = knightRingPose(st.s), f = st.f;
  st.o = {a: -(HEAVE * p.heave - DROP * p.drop * p.heave) * f, c: COCK * p.cock * f, h: -START * p.start * f};
  arms0.rotation.x += st.o.a; head.rotation.z += st.o.c; head.rotation.x += st.o.h;
  return p;
}
