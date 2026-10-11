// A golem's idle ratchet (golem.js, straw-golem.js, paper-golem.js, quirk 'golem'). A golem that
// stands still now and then runs down a notch at a time: the head ratchets round in three hard
// clicks, the nearer arm locks up in jerks, and then everything lets go and drops back with a
// clunk. It reads as a machine that was not made to be idle. Walking, an action or death takes it
// back within a moment.
//
// Offsets only: the head's yaw (rotation.y) and roll (rotation.z) and the right arm's lift
// (rotation.x) are added on top of whatever the idle loop and the action layer wrote, and taken
// back first next frame, so nothing drifts.

// GRIND: head yaw (rad); CANT: head roll (rad); POINT: arm lift (rad).
export const GRIND = .75, CANT = .15, POINT = 1.1;
// First ratchet after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 8, RATCHET_LEN = 3.6;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);

export const ratchets = a => !!(a && !a.asset && a.quirk === 'golem' && a.head && a.arms?.length === 2);

const ZERO = () => ({grind: 0, cant: 0, point: 0});

// The ratchet at progress u (0..1): {grind} 0..1 the head clicks round in three equal notches at
// .08, .24 and .4, holds to .8, then drops back .8-.9; {cant} 0..1 it tilts with the last notch;
// {point} 0..1 the arm locks up .3-.5 and drops with the head. All exactly zero at both ends.
export function ratchetPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const notch = (smooth((u - .08) / .05) + smooth((u - .24) / .05) + smooth((u - .4) / .05)) / 3;
  p.grind = clamp01(notch - smooth((u - .8) / .1)) * f;
  p.cant = clamp01(smooth((u - .4) / .1) - smooth((u - .8) / .1)) * f;
  p.point = win(u, .3, .2, .8, .1) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not ratcheting.
export function updateGolemRatchet(actor, dt, t, busy) {
  if (!ratchets(actor)) return null;
  const st = actor.golemRatchet || (actor.golemRatchet = {seed: ((actor.g?.id ?? 1) * 40503) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head} = actor, arm = actor.arms[1], o = st.applied;
  head.rotation.y -= o.grind * GRIND; head.rotation.z -= o.cant * CANT;
  arm.rotation.x += o.point * POINT;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted ratchet always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / RATCHET_LEN;
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
  const p = ratchetPose(st.cur.u, st.f);
  head.rotation.y += p.grind * GRIND; head.rotation.z += p.cant * CANT;
  arm.rotation.x -= p.point * POINT;
  st.applied = p;
  return p;
}
