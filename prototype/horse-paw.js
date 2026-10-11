// A horse's or unicorn's idle paw (the horse build in creatures.js). A horse that stands still now
// and then lifts a foreleg, rakes the floor with it three times as if digging for something it
// has smelled, then stamps hard; the whole body dips on the stamp and the tail gives one stiff
// lash. Walking, an action or death takes it back within a moment. Centaurs are left alone.
//
// Offsets only: the paw leg's pitch (rotation.x), the body's pitch (rotation.x) and the tail's
// swing (rotation.z) are added on top of whatever gait.js and the action layer wrote, and taken
// back first next frame, so nothing drifts.
export const LIFT = .75, RAKE = .45, DIP = .035, LASH = .35;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 6, GAP_SPAN = 9, LEN = 2.6;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const paws = a => !!(a && !a.asset && a.quirk === 'unicorn' && !a.head && a.body && a.legs?.length === 4);

// The paw at progress u (0..1): {lift} 0..1 foreleg raised, {rake} -1..1 the scrape back and forth,
// {dip} 0..1 body pitch on the stamp, {lash} -1..1 tail. The leg rises, rakes three times, drops
// in a stamp that dips the body, and the tail lashes once after it. All zero at both ends.
export function pawPose(u) {
  if (!(u > 0) || !(u < 1)) return {lift: 0, rake: 0, dip: 0, lash: 0};
  const up = smooth(u / .18), down = smooth((u - .66) / .04);
  const lift = up * (1 - down);
  const raking = smooth((u - .2) / .04) * (1 - smooth((u - .6) / .04));
  const rake = Math.sin((u - .2) * Math.PI * 6 / .4) * raking;
  const dip = Math.exp(-(((u - .72) / .05) ** 2));
  const lash = Math.exp(-(((u - .8) / .06) ** 2)) * Math.sin((u - .8) * 60);
  const c = v => Math.max(-1, Math.min(1, v));
  return {lift: c(lift), rake: c(rake), dip: c(dip), lash: c(lash)};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateHorsePaw(actor, dt, t, busy) {
  if (!paws(actor)) return null;
  const st = actor.horsePaw || (actor.horsePaw = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, leg: null, o: {l: 0, b: 0, z: 0}});
  const o = st.o, body = actor.body, tail = actor.tail;
  if (st.leg) st.leg.rotation.x -= o.l;
  body.rotation.x -= o.b;
  if (tail) tail.rotation.z -= o.z;
  st.o = {l: 0, b: 0, z: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    st.wait -= dt;
    // legs alternate front, hind per side: indices 0 and 2 are the forelegs
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.leg = actor.legs[rand(st) < .5 ? 0 : 2]; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = pawPose(st.s), f = st.f;
  // a foreleg swings forward (-x) to lift and rakes back and forth about that
  st.o = {l: -(LIFT * p.lift + RAKE * p.rake * p.lift) * f, b: DIP * p.dip * f, z: LASH * p.lash * f};
  st.leg.rotation.x += st.o.l;
  body.rotation.x += st.o.b;
  if (tail) tail.rotation.z += st.o.z;
  return p;
}
