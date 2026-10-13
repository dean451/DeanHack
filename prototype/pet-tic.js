// A pet dog's idle tic (canine.js, quirk 'dog'). A standing pet now and then cocks its head
// hard to one side, as if hearing something the hero cannot, holds it a beat too long, wags the
// tail in three quick jerks with one stray flick after the rest, and straightens with a snap.
// Walking, an action or death takes it back within a moment. Wild canines have their own watch
// (canine-watch.js).
//
// Offsets only: the head's yaw (rotation.y) and roll (rotation.z) and the tail's swing
// (rotation.z) are added on top of whatever gait.js and the action layer wrote, and taken back
// first next frame, so nothing drifts.
export const COCK = .38, TILT = .3, WAG = .5;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 7, GAP_SPAN = 9, LEN = 2.6;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const tics = a => !!(a && !a.asset && a.quirk === 'dog' && a.head && a.body);

// The tic at progress u (0..1): {cock} 0..1 head yaw, {tilt} 0..1 head roll, {wag} -1..1 tail.
// The head snaps aside, rolls over a little later and holds, then straightens; the tail jerks
// three times while it holds and once more, late. All zero at both ends.
export function ticPose(u) {
  if (!(u > 0) || !(u < 1)) return {cock: 0, tilt: 0, wag: 0};
  // Straightened, it shakes its head twice, quick and embarrassed, as if it had not been caught.
  const shake = u > .88 ? .3 * Math.sin(Math.PI * clamp01((u - .88) / .1)) * Math.sin((u - .88) * 125) : 0;
  const cock = smooth(u / .08) * (1 - smooth((u - .82) / .05)) + shake;
  const tilt = smooth((u - .1) / .12) * (1 - smooth((u - .8) / .06));
  const bump = c => Math.exp(-(((u - c) / .035) ** 2));
  const wag = bump(.3) - bump(.4) + bump(.5) - .7 * bump(.7);
  return {cock: Math.max(-1, Math.min(1, cock)), tilt, wag: Math.max(-1, Math.min(1, wag))};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updatePetTic(actor, dt, t, busy) {
  if (!tics(actor)) return null;
  const st = actor.petTic || (actor.petTic = {seed: ((actor.g?.id ?? 1) * 7919) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {y: 0, hz: 0, tz: 0}});
  const o = st.o, head = actor.head, tail = actor.tail;
  head.rotation.y -= o.y; head.rotation.z -= o.hz;
  if (tail) tail.rotation.z -= o.tz;
  st.o = {y: 0, hz: 0, tz: 0};
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
  const p = ticPose(st.s), f = st.f;
  st.o = {y: COCK * p.cock * f, hz: TILT * p.tilt * f, tz: WAG * p.wag * f};
  head.rotation.y += st.o.y; head.rotation.z += st.o.hz;
  if (tail) tail.rotation.z += st.o.tz;
  return p;
}
