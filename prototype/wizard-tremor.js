// An idle spell-tremor for the wizard (wizard.js). A wizard standing still now and then lifts the
// free hand and lets the fingers shake with some held-in spark, the head tilting to squint at it,
// and then the spark bites: the hand flinches back and the head jerks up. Walking, an action or
// death takes it back within a moment.
//
// Offsets only: arm and head rotations are added on top of whatever the gait and action layers
// wrote, and taken back first next frame, so nothing drifts.
export const LIFT = 1.0, SHAKE = .16, SQUINT = .25, FLINCH = .45, LEN = 3.4, GAP_MIN = 9, GAP_SPAN = 10;
export const FIRST_MIN = 3, FIRST_SPAN = 5;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const trembles = a => !!(a && !a.asset && a.kind === 'wizard' && a.head && a.arms?.length > 1 && a.body);

// The pose at progress u (0..1): lift, shake, squint, flinch, each 0..1. All exactly zero at both ends.
export function wizardTremorPose(u) {
  if (!(u > 0) || !(u < 1)) return {lift: 0, shake: 0, squint: 0, flinch: 0};
  const lift = smooth(u / .12) * (1 - smooth((u - .84) / .1));
  const env = smooth((u - .14) / .06) * (1 - smooth((u - .62) / .04));
  const shake = Math.sin(u * 90) * env;
  const squint = smooth((u - .12) / .1) * (1 - smooth((u - .64) / .04));
  const flinch = Math.exp(-(((u - .68) / .035) ** 2));
  return {lift, shake, squint, flinch};
}

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateWizardTremor(actor, dt, t, busy) {
  if (!trembles(actor)) return null;
  const st = actor.wizardTremor || (actor.wizardTremor = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {a: 0, s: 0, c: 0, h: 0}});
  const o = st.o, arms0 = actor.arms[0], head = actor.head;
  arms0.rotation.x -= o.a; arms0.rotation.z -= o.s; head.rotation.z -= o.c; head.rotation.x -= o.h;
  st.o = {a: 0, s: 0, c: 0, h: 0};
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
  const p = wizardTremorPose(st.s), f = st.f;
  st.o = {a: -(LIFT * p.lift - FLINCH * p.flinch * p.lift) * f, s: SHAKE * p.shake * f, c: SQUINT * p.squint * f, h: -FLINCH * p.flinch * f};
  arms0.rotation.x += st.o.a; arms0.rotation.z += st.o.s; head.rotation.z += st.o.c; head.rotation.x += st.o.h;
  return p;
}
