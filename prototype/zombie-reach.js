// A zombie's idle reach (zombie.js, quirk 'zombie'). A zombie that stands still now and then
// remembers hunger: the head lolls onto one shoulder and tips back, both arms drag up slowly to
// claw at the air in front of it, trembling, and then drop like dead weight as the body sags and
// the thought leaves. Walking, an action or death takes it back within a moment.
//
// Offsets only: the body's drop, the head's roll (rotation.z) and pitch (rotation.x) and each
// arm's lift (rotation.x) and tremble (rotation.z) are added on top of whatever the idle loop and
// the action layer wrote, and taken back first next frame, so nothing drifts.

// SAG: body drop; LOLL: head roll (rad); TIP: head pitch back (rad); REACH: arm lift (rad); SHAKE: arm tremble (rad).
export const SAG = .03, LOLL = .5, TIP = .3, REACH = 1.2, SHAKE = .12;
// First reach after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 8, REACH_LEN = 3.4;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);

export const reaches = a => !!(a && !a.asset && a.quirk === 'zombie' && a.head && a.body && a.arms?.length === 2);

const ZERO = () => ({sag: 0, loll: 0, tip: 0, reach: 0, shake: 0});

// The reach at progress u (0..1): {loll} 0..1 the head rolls over .05-.3 and holds to .8, righting
// .8-.97; {tip} 0..1 it tips back over .25-.5 and falls .78-.95; {reach} 0..1 both arms drag up
// .3-.55, hold to .75 and drop .75-.82 (a hard fall); {shake} -1..1 the raised arms tremble;
// {sag} 0..1 the body slumps in after the drop, .8-.98 and gone by 1. All exactly zero at both ends.
export function reachPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.loll = win(u, .05, .25, .8, .17) * f;
  p.tip = win(u, .25, .25, .78, .17) * f;
  p.reach = win(u, .3, .25, .75, .07) * f;
  p.shake = Math.sin(u * 90) * p.reach * p.reach;
  p.sag = win(u, .76, .06, .9, .09) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not reaching.
export function updateZombieReach(actor, dt, t, busy) {
  if (!reaches(actor)) return null;
  const st = actor.zombieReach || (actor.zombieReach = {seed: ((actor.g?.id ?? 1) * 40503) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, body, arms} = actor, o = st.applied;
  body.position.y += o.sag * SAG;
  head.rotation.z -= o.loll * LOLL; head.rotation.x -= o.tip * TIP;
  for (const [i, arm] of arms.entries()) { arm.rotation.x += o.reach * REACH; arm.rotation.z -= (i ? -1 : 1) * o.shake * SHAKE; }
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted reach always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / REACH_LEN;
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
  const p = reachPose(st.cur.u, st.f);
  body.position.y -= p.sag * SAG;
  head.rotation.z += p.loll * LOLL; head.rotation.x += p.tip * TIP;
  for (const [i, arm] of arms.entries()) { arm.rotation.x -= p.reach * REACH; arm.rotation.z += (i ? -1 : 1) * p.shake * SHAKE; }
  st.applied = p;
  return p;
}
