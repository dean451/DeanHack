// An orc's idle neck-crack (orc.js, goblin.js, bugbear.js). An orc, goblin or bugbear that stands
// still now and then rolls its head slowly to one side as if working out a stiffness, glowers
// along the way, then snaps it hard the other way with a jolt of the shoulders. Walking, an action
// or death takes it back within a moment.
//
// Offsets only: the head's roll (rotation.z) and yaw (rotation.y) and the body's roll (rotation.z)
// are added on top of whatever gait.js and the action layer wrote, and taken back first next
// frame, so nothing drifts.
export const CANT = .32, GLOWER = .22, JOLT = .05;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 5, GAP_SPAN = 9, LEN = 2.8;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const cracks = a => !!(a && !a.asset && a.quirk === 'orc' && a.head && a.body);

// The crack at progress u (0..1): {cant} -1..1 head roll, {glower} -1..1 head yaw, {jolt} -1..1 body roll.
// A slow roll to one side, then a snap through to the other that overshoots and settles; the jolt
// is one sharp spike at the snap. All zero at both ends.
export function crackPose(u) {
  if (!(u > 0) || !(u < 1)) return {cant: 0, glower: 0, jolt: 0};
  const slow = smooth(u / .5), snap = smooth((u - .52) / .04), home = smooth((u - .72) / .25);
  const cant = slow * (1 - snap) - .8 * snap * (1 - home) - .1 * Math.sin(u * Math.PI * 9) * snap * (1 - home);
  const glower = smooth(u / .4) * (1 - smooth((u - .5) / .1)) * .8;
  const jolt = Math.exp(-(((u - .55) / .03) ** 2)) * Math.sin(u * Math.PI * 40 );
  const c = v => Math.max(-1, Math.min(1, v));
  return {cant: c(cant), glower: c(glower), jolt: c(jolt)};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateOrcCrack(actor, dt, t, busy) {
  if (!cracks(actor)) return null;
  const st = actor.orcCrack || (actor.orcCrack = {seed: ((actor.g?.id ?? 1) * 7919) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {z: 0, y: 0, b: 0}});
  const o = st.o, head = actor.head, body = actor.body;
  head.rotation.z -= o.z; head.rotation.y -= o.y; body.rotation.z -= o.b;
  st.o = {z: 0, y: 0, b: 0};
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
  const p = crackPose(st.s), f = st.f;
  st.o = {z: CANT * p.cant * f, y: GLOWER * p.glower * f, b: JOLT * p.jolt * f};
  head.rotation.z += st.o.z; head.rotation.y += st.o.y; body.rotation.z += st.o.b;
  return p;
}
