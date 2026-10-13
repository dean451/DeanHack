// A mummy's idle creak (mummy.js, quirk 'mummy'). A mummy that stands still now and then wakes
// stiffly: the head grinds slowly round to one side, stops, and the nearer arm creaks up as if to
// point at something, then everything locks and the head snaps back square with a dry crack.
// Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's yaw (rotation.y) and roll (rotation.z) and the right arm's lift
// (rotation.x) are added on top of whatever the idle loop and the action layer wrote, and taken
// back first next frame, so nothing drifts.

// GRIND: head yaw (rad); CANT: head roll (rad); POINT: arm lift (rad).
export const GRIND = .9, CANT = .2, POINT = 1.3;
// First creak after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 8, CREAK_LEN = 3.6;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);

export const creaks = a => !!(a && !a.asset && a.quirk === 'mummy' && a.head && a.arms?.length === 2);

const ZERO = () => ({grind: 0, cant: 0, point: 0});

// The creak at progress u (0..1): {grind} 0..1 the head turns slowly .06-.4, holds to .74 with a
// small judder, then snaps back .74-.8; {cant} 0..1 it tilts with the turn; {point} 0..1 the arm
// creaks up .3-.6 and drops with the head .74-.82. All exactly zero at both ends.
export function creakPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const turn = win(u, .06, .34, .74, .06);
  p.grind = clamp01(turn + Math.sin(u * 140) * .06 * win(u, .1, .1, .7, .05)) * f;
  // The head has locked square; late, it grinds a little way round again and drops back, unlatched.
  p.grind = clamp01(p.grind / f + .3 * Math.exp(-(((u - .9) / .018) ** 2))) * f;
  p.cant = win(u, .1, .3, .74, .06) * f;
  p.point = win(u, .3, .3, .74, .08) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not creaking.
export function updateMummyCreak(actor, dt, t, busy) {
  if (!creaks(actor)) return null;
  const st = actor.mummyCreak || (actor.mummyCreak = {seed: ((actor.g?.id ?? 1) * 52711) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head} = actor, arm = actor.arms[1], o = st.applied;
  head.rotation.y -= o.grind * GRIND; head.rotation.z -= o.cant * CANT;
  arm.rotation.x += o.point * POINT;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted creak always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / CREAK_LEN;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {u: 0}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = creakPose(st.cur.u, st.f);
  head.rotation.y += p.grind * GRIND; head.rotation.z += p.cant * CANT;
  arm.rotation.x -= p.point * POINT;
  st.applied = p;
  return p;
}
