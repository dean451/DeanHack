// A spider's idle probe (spider.js). A spider that stands still now and then goes wrong: the front
// pair of legs rises off the floor and feels the air, one tapping three times in quick uneven
// jabs, then the other answering with a single slow tap, as if something nearby had been
// noticed. The body sinks a little onto the back legs while it listens. Walking, an action or
// death takes it back within a moment.
//
// Offsets only: the front legs' lift (rotation.z) and tap (rotation.y) and the body's height are
// added on top of whatever skitter.js and the action layer wrote, and taken back first next
// frame, so nothing drifts. Scorpions (also quirk 'spider', but with claws) are left alone.

// LIFT: front leg raise (rad); TAP: reach of a jab (rad); SINK: body drop on the back legs.
export const LIFT = .55, TAP = .3, SINK = .012;
// First probe after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 5, GAP_SPAN = 8, PROBE_LEN = 2.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const probes = a => !!(a && !a.asset && a.quirk === 'spider' && !a.claws && a.legs?.length === 8 && a.body);

// The probe at progress u (0..1): {a, b} lift of the first and second front leg (0..1) and
// {ta, tb} their taps (-1..1). The first leg rises, jabs three times at uneven gaps and settles;
// the second rises late, taps once, slowly, and settles. All exactly zero at both ends.
export function probePose(u) {
  const z = {a: 0, b: 0, ta: 0, tb: 0};
  if (!(u > 0) || !(u < 1)) return z;
  const a = smooth(u / .12) * (1 - smooth((u - .5) / .12));
  const b = smooth((u - .4) / .12) * (1 - smooth((u - .88) / .12));
  const jab = (c, w) => Math.exp(-(((u - c) / w) ** 2));
  return {a, b, ta: a * Math.min(1, jab(.2, .02) + jab(.27, .02) + jab(.41, .025)), tb: -b * jab(.66, .05)};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the skitter/gait layer. `busy` is true while the actor walks or acts.
export function updateSpiderProbe(actor, dt, t, busy) {
  if (!probes(actor)) return null;
  const st = actor.spiderProbe || (actor.spiderProbe = {seed: ((actor.g?.id ?? 1) * 40503) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {z0: 0, z4: 0, y0: 0, y4: 0, h: 0}});
  const o = st.o, L = actor.legs;
  L[0].rotation.z -= o.z0; L[4].rotation.z -= o.z4; L[0].rotation.y -= o.y0; L[4].rotation.y -= o.y4;
  actor.body.position.y -= o.h;
  st.o = {z0: 0, z4: 0, y0: 0, y4: 0, h: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / PROBE_LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = probePose(st.s), f = st.f;
  // right legs rise with +z and reach forward with -y; left legs the other way round
  st.o = {z0: LIFT * p.a * f, z4: -LIFT * p.b * f, y0: -TAP * p.ta * f, y4: TAP * p.tb * f, h: -SINK * Math.max(p.a, p.b) * f};
  L[0].rotation.z += st.o.z0; L[4].rotation.z += st.o.z4; L[0].rotation.y += st.o.y0; L[4].rotation.y += st.o.y4;
  actor.body.position.y += st.o.h;
  return p;
}
