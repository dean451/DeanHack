// A priest's idle vigil (priest.js). A priest that stands still now and then bows the head, lifts
// the free hand in a slow warding gesture, and then shakes the head in a small, tight, joyless
// refusal, twice, as if tallying a congregation's sins and finding the sum short. Walking, an
// action or death takes it back within a moment.
//
// Offsets only: the head's pitch (rotation.x) and yaw (rotation.y) and the left arm's lift
// (rotation.x) are added on top of whatever the gait and action layers wrote, and taken back first
// next frame, so nothing drifts.
export const BOW = .3, REFUSE = .32, WARD = .85;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 6, GAP_SPAN = 9, LEN = 3.4;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const keepsVigil = a => !!(a && !a.asset && a.quirk === 'priest' && a.head && a.arms?.length > 1 && a.body);

// The vigil at progress u (0..1): {bow} 0..1 head bowed and hand raised, {refuse} -1..1 the head shake.
// The head bows and the hand rises over the first third, the head shakes twice while it is held, then
// both let go. Both exactly zero at both ends.
export function vigilPose(u) {
  if (!(u > 0) || !(u < 1)) return {bow: 0, refuse: 0};
  const bow = smooth(u / .3) * (1 - smooth((u - .8) / .18));
  const shaking = smooth((u - .38) / .04) * (1 - smooth((u - .7) / .05));
  return {bow, refuse: Math.max(-1, Math.min(1, Math.sin((u - .38) * Math.PI * 2 * 5.5) * shaking))};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updatePriestVigil(actor, dt, t, busy) {
  if (!keepsVigil(actor)) return null;
  const st = actor.priestVigil || (actor.priestVigil = {seed: ((actor.g?.id ?? 1) * 15485) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {x: 0, y: 0, a: 0}});
  const o = st.o, head = actor.head, arm = actor.arms[0];
  head.rotation.x -= o.x; head.rotation.y -= o.y; arm.rotation.x -= o.a;
  st.o = {x: 0, y: 0, a: 0};
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
  const p = vigilPose(st.s), f = st.f;
  st.o = {x: BOW * p.bow * f, y: REFUSE * p.refuse * f, a: -WARD * p.bow * f};
  head.rotation.x += st.o.x; head.rotation.y += st.o.y; arm.rotation.x += st.o.a;
  return p;
}
