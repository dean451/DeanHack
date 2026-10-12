// A bee's idle preen (bee.js, any bee). A bee that stands still now and then scrubs its forelegs
// over its face like a fly: the head dips into the stroke, the front pair rub back and forth in
// opposed strokes, then both hang up by the mouth a beat too long, and the head jerks clear.
// Walking, an action or death takes it back within a moment.
//
// Offsets only: the front legs' pitch (rotation.x) and the head's pitch (rotation.x) are added on
// top of whatever the gait and action layers wrote, and taken back first next frame, so nothing drifts.
export const LIFT = .9, SCRUB = .5, DIP = .3;
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 6, GAP_SPAN = 8, LEN = 2.8;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const preens = a => !!(a && !a.asset && a.quirk === 'bee' && a.head && a.legs?.length === 6);

// The preen at progress u (0..1): {lift} 0..1 forelegs raised to the face, {scrub} -1..1 the
// opposed strokes, {dip} 0..1 head bowed into it. Rises over the first fifth, scrubs from .2 to
// .7, hangs raised (too long) until .88 and drops; the head stays bowed until .9 and jerks up.
export function preenPose(u) {
  if (!(u > 0) || !(u < 1)) return {lift: 0, scrub: 0, dip: 0};
  const lift = smooth(u / .2) * (1 - smooth((u - .88) / .06));
  const scrubbing = smooth((u - .2) / .03) * (1 - smooth((u - .7) / .03));
  const scrub = Math.max(-1, Math.min(1, Math.sin((u - .2) * Math.PI * 2 * 7) * scrubbing));
  const dip = smooth((u - .1) / .1) * (1 - smooth((u - .9) / .015));
  return {lift, scrub, dip};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateBeePreen(actor, dt, t, busy) {
  if (!preens(actor)) return null;
  const st = actor.beePreen || (actor.beePreen = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {l: 0, r: 0, h: 0}});
  const L = actor.legs[0], R = actor.legs[3], head = actor.head;
  L.rotation.x -= st.o.l; R.rotation.x -= st.o.r; head.rotation.x -= st.o.h;
  st.o = {l: 0, r: 0, h: 0};
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
  const p = preenPose(st.s), f = st.f;
  st.o = {l: (-LIFT * p.lift + SCRUB * p.scrub) * f, r: (-LIFT * p.lift - SCRUB * p.scrub) * f, h: DIP * p.dip * f};
  L.rotation.x += st.o.l; R.rotation.x += st.o.r; head.rotation.x += st.o.h;
  return p;
}
