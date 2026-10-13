// A lemure's idle slump (lemure.js). A lemure that stands still now and then loses what little
// shape it has: the mound sags down into its own ooze, the face slides off to one side on the
// lolling head, and one thin arm drags up out of the mass and gropes blindly forward, trembling,
// before the whole thing gives up and slops back to where it was. Walking, an action or death
// takes it back within a moment.
//
// Offsets only: the body's height, the head's roll (rotation.z) and sag (rotation.x), and the
// reaching arm's lift (rotation.x) and tremble (rotation.z) are added on top of whatever the
// idle loop and the action layer wrote, and taken back first next frame, so nothing drifts.

// SAG: body drop; LOLL: head roll (rad); NOD: head pitch (rad); REACH: arm lift (rad); SHAKE: arm tremble (rad).
export const SAG = .035, LOLL = .4, NOD = .15, REACH = .6, SHAKE = .12;
// First slump after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 6, GAP_SPAN = 8, SLUMP_LEN = 3.6;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, ea, b, eb) => smooth((u - a) / ea) - smooth((u - b) / eb);

export const slumps = a => !!(a && !a.asset && a.quirk === 'lemure' && a.head && a.body && a.arms?.length === 2);

const ZERO = () => ({sag: 0, loll: 0, reach: 0, shake: 0});

// The slump at progress u (0..1), each part 0..1 (shake -1..1): the body sinks .04-.3 and holds
// to .8, slopping back .8-.98; the head lolls over .1-.45 and rolls home .75-.97; the arm drags
// up .3-.55, trembles while raised (fading as it drops, so it is still at both ends) and falls
// .74-.9. All exactly zero at both ends.
export function slumpPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.sag = win(u, .04, .26, .8, .18) * f;
  p.loll = win(u, .1, .35, .75, .22) * f;
  // once the arm has dropped it jerks up a little again, as if the mass had forgotten something
  p.reach = (win(u, .3, .25, .74, .16) + .25 * Math.exp(-(((u - .93) / .015) ** 2))) * f;
  p.shake = Math.sin(u * 95) * p.reach * p.reach;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the action layer. `busy` is true while the actor walks or has an
// action playing or queued. Returns the pose applied this frame, or null when not slumping.
export function updateLemureSlump(actor, dt, t, busy) {
  if (!slumps(actor)) return null;
  const st = actor.lemureSlump || (actor.lemureSlump = {seed: ((actor.g?.id ?? 1) * 17389) % 2147483647 || 1, wait: 0, cur: null, f: 0, side: 0, applied: ZERO()});
  const {head, body} = actor, o = st.applied, arm = actor.arms[st.side];
  body.position.y += o.sag * SAG;
  head.rotation.z -= o.loll * LOLL; head.rotation.x -= o.loll * NOD;
  arm.rotation.x += o.reach * REACH; arm.rotation.z -= o.shake * SHAKE;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted slump always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / SLUMP_LEN;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {u: 0}; st.f = 1; st.wait = 0; st.side = rand(st) < .5 ? 0 : 1; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = slumpPose(st.cur.u, st.f), live = actor.arms[st.side];
  body.position.y -= p.sag * SAG;
  head.rotation.z += p.loll * LOLL; head.rotation.x += p.loll * NOD;
  live.rotation.x -= p.reach * REACH; live.rotation.z += p.shake * SHAKE;
  st.applied = p;
  return p;
}
