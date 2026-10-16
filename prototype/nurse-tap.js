// A nurse's idle tic (nurse.js, quirk 'nurse'). A nurse that stands still now and then lifts the
// syringe to the light, flicks it three times with a fingernail to clear the bubbles, and holds it
// there while her head tilts aside and stays tilted a beat too long, as if waiting for a patient to
// notice. The head then snaps upright. Walking, an action or death takes it back within a moment.
//
// Offsets only: the syringe arm's lift (rotation.x) and the head's tilt (rotation.z) are added on
// top of whatever the gait and action layers wrote, and taken back first next frame, so nothing drifts.
export const RAISE = .95, FLICK = .14, TILT = .34;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 7, GAP_SPAN = 9, LEN = 3.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const taps = a => !!(a && !a.asset && a.quirk === 'nurse' && a.head && a.arms?.length > 1);

// The tic at progress u (0..1): {raise} 0..1 syringe lifted, {flick} -1..1 the three taps, {tilt}
// 0..1 head tilted. The arm rises over the first quarter, taps from .3 to .55, lowers from .78;
// the head tilts from .35, stays tilted until .86 (too long) and snaps upright. Zero at both ends.
export function tapPose(u) {
  if (!(u > 0) || !(u < 1)) return {raise: 0, flick: 0, tilt: 0};
  const raise = smooth(u / .25) * (1 - smooth((u - .78) / .18));
  const tapping = smooth((u - .28) / .02) * (1 - smooth((u - .55) / .02));
  // One stray flick after the head has snapped upright, on the half-lowered syringe.
  const stray = Math.exp(-(((u - .9) / .02) ** 2)) * raise * Math.sin((u - .9) * 150);
  const flick = Math.max(-1, Math.min(1, Math.sin((u - .3) * Math.PI * 2 * 6) * tapping + stray));
  const tilt = smooth((u - .35) / .12) * (1 - smooth((u - .86) / .02));
  return {raise, flick, tilt};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateNurseTap(actor, dt, t, busy) {
  if (!taps(actor)) return null;
  const st = actor.nurseTap || (actor.nurseTap = {seed: ((actor.g?.id ?? 1) * 7919) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {a: 0, z: 0}});
  const head = actor.head, arm = actor.arms[1];
  arm.rotation.x -= st.o.a; head.rotation.z -= st.o.z;
  st.o = {a: 0, z: 0};
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
  st.o = {a: (-RAISE * p.raise + FLICK * p.flick) * f, z: TILT * p.tilt * f};
  arm.rotation.x += st.o.a; head.rotation.z += st.o.z;
  return p;
}
