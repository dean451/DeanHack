// Idle salute for the monk, whose model (monk.js) fights with bare fists. A monk that has stood
// still for a few seconds now and then gives the martial artist's salute: both arms come up in
// front of the chest, the right fist pressed into the left hand, then the monk bows (the head
// dips and the body leans forward from the feet), holds it a breath, straightens, and lowers the
// hands back to its sides. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head, both arms and the body's forward lean move, as offsets on top of whatever the
// idle loop and actions.js posed this frame. Each frame the bow takes back its own last offset
// first and then adds this frame's, like salute.js.

// Arm offsets at the salute: `arm` pitch (negative raises forward) and `roll` (the right arm's;
// the left mirrors it). The roll brings the fists together in front of the breastbone.
export const ARM = -1.25, ROLL = -.6;
// The left hand sits a little lower, so the right fist rests in it rather than on it.
export const PALM_DROP = .08;
// The bow: head nod (positive rotation.x nods down) and body lean (positive tips forward).
export const NOD = .3, LEAN = .12;
// Seconds for one salute.
export const BOW_LEN = 4;
// First salute after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 4, GAP_MIN = 14, GAP_SPAN = 10;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const bows = a => !!(a && !a.asset && a.kind === 'monk' && a.head && a.body && a.arms?.length === 2);

const ZERO = () => ({right: 0, left: 0, roll: 0, nod: 0, lean: 0});

// Phases in u: hands up .04–.22, bow .3–.45, held to .58, up by .7, hands down .74–.94.
export function bowPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const hands = smooth((u - .04) / .18) - smooth((u - .74) / .2);
  const bow = smooth((u - .3) / .15) - smooth((u - .58) / .12);
  p.right = ARM * hands * f;
  p.left = (ARM + PALM_DROP) * hands * f;
  p.roll = ROLL * hands * f;
  p.nod = NOD * bow * f;
  p.lean = LEAN * bow * f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

function apply(actor, p, s) {
  const [left, right] = actor.arms;
  right.rotation.x += s * p.right; right.rotation.z += s * p.roll;
  left.rotation.x += s * p.left; left.rotation.z -= s * p.roll;
  actor.head.rotation.x += s * p.nod; actor.body.rotation.x += s * p.lean;
}

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not bowing.
export function updateMonkBow(actor, dt, t, busy) {
  if (!bows(actor)) return null;
  const st = actor.monkBow || (actor.monkBow = {seed: ((actor.g?.id ?? 1) * 69621) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  apply(actor, st.applied, -1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted salute always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / BOW_LEN;
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
  const p = bowPose(st.cur.u, st.f);
  apply(actor, p, 1);
  st.applied = p;
  return p;
}
