// A hobbit's idle clutch (hobbit.js, quirk 'hobbit'). A hobbit that stands still now and then
// grows nervous: the head darts furtively left, then right, then left again, and the right hand
// snatches to the chest to clutch something hidden there, trembling, before it dares let go and
// pretends nothing happened. Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's yaw (rotation.y) and the right arm's lift (rotation.x) and tremble
// (rotation.z) are added on top of whatever the idle loop and the action layer wrote, and taken
// back first next frame, so nothing drifts.

// GLANCE: head yaw (rad); CLUTCH: arm lift to the chest (rad); SHAKE: arm tremble (rad).
export const GLANCE = .6, CLUTCH = 1.1, SHAKE = .1;
// First clutch after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 8, CLUTCH_LEN = 3.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);

export const clutches = a => !!(a && !a.asset && a.quirk === 'hobbit' && a.head && a.arms?.length === 2);

const ZERO = () => ({glance: 0, clutch: 0, shake: 0});

// The clutch at progress u (0..1): {glance} -1..1 the head darts left, right, left (a sine of one
// and a half turns under a swell over .04-.5, so it settles) ; {clutch} 0..1 the hand snatches
// up .42-.5 and holds to .82, lowering .82-.97; {shake} -1..1 the held hand trembles. All exactly
// zero at both ends.
export function clutchPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  // the hand let go, he darts one last look back over his shoulder, to check he was not seen
  p.glance = (-Math.sin(u * Math.PI * 7) * win(u, .04, .08, .5, .12) + .5 * hump(u, .86, .94)) * f;
  p.clutch = win(u, .42, .08, .82, .15) * f;
  p.shake = Math.sin(u * 110) * p.clutch * p.clutch;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not clutching.
export function updateHobbitClutch(actor, dt, t, busy) {
  if (!clutches(actor)) return null;
  const st = actor.hobbitClutch || (actor.hobbitClutch = {seed: ((actor.g?.id ?? 1) * 31337) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head} = actor, arm = actor.arms[1], o = st.applied;
  head.rotation.y -= o.glance * GLANCE;
  arm.rotation.x += o.clutch * CLUTCH; arm.rotation.z -= o.shake * SHAKE;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted clutch always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / CLUTCH_LEN;
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
  const p = clutchPose(st.cur.u, st.f);
  head.rotation.y += p.glance * GLANCE;
  arm.rotation.x -= p.clutch * CLUTCH; arm.rotation.z += p.shake * SHAKE;
  st.applied = p;
  return p;
}
