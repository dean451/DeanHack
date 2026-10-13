// An elf's idle listen (elf.js, quirk 'elf'). An elf that stands still now and then hears
// something that is not there: the head snaps round and tilts, a hand lifts toward the ear and
// everything freezes, listening, then the head flicks the other way, once, to check behind, and
// settles with a cold stillness. Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's yaw (rotation.y) and roll (rotation.z) and the right arm's lift
// (rotation.x) are added on top of whatever the idle loop and the action layer wrote, and taken
// back first next frame, so nothing drifts.

// GRIND: head yaw (rad); CANT: head roll (rad); POINT: arm lift (rad).
export const GRIND = .8, CANT = .22, POINT = 1.2;
// First listen after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 8, LISTEN_LEN = 3.6;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);

export const listens = a => !!(a && !a.asset && a.quirk === 'elf' && a.head && a.arms?.length === 2);

const ZERO = () => ({grind: 0, cant: 0, point: 0});

// The listen at progress u (0..1): {grind} -1..1 the head snaps round .05-.13 and holds to .4,
// then flicks the other way (-.8) .5-.56, holds to .85 and settles .85-.93; {cant} 0..1 it tilts
// with the first turn; {point} 0..1 the hand lifts to the ear .15-.35 and drops .6-.7. All
// exactly zero at both ends.
export function listenPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.grind = (win(u, .05, .08, .4, .1) - .8 * win(u, .5, .06, .85, .08)) * f;
  p.cant = win(u, .06, .12, .5, .08) * f;
  // at the ear, the hand rubs once, as if the sound were a thread to pull loose
  p.point = Math.max(0, win(u, .15, .2, .6, .1) - .22 * Math.sin(Math.PI * clamp01((u - .36) / .1)) ** 2) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not listening.
export function updateElfListen(actor, dt, t, busy) {
  if (!listens(actor)) return null;
  const st = actor.elfListen || (actor.elfListen = {seed: ((actor.g?.id ?? 1) * 31337) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head} = actor, arm = actor.arms[1], o = st.applied;
  head.rotation.y -= o.grind * GRIND; head.rotation.z -= o.cant * CANT;
  arm.rotation.x += o.point * POINT;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted listen always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / LISTEN_LEN;
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
  const p = listenPose(st.cur.u, st.f);
  head.rotation.y += p.grind * GRIND; head.rotation.z += p.cant * CANT;
  arm.rotation.x -= p.point * POINT;
  st.applied = p;
  return p;
}
