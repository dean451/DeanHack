// Idle cap-tug for gnomes (gnome.js). A gnome that has stood still for a few seconds now and then
// grows suddenly sure he is being watched: the free (left) hand shoots up and yanks the tall cap
// down over his brow, the cap crumples sideways, and the head jerks left, then right, then left
// again, quick and twitchy, before the hand lets go and the cap springs back askew. Walking, an
// action or death fades it out within ~0.1 s.
//
// Only the head, the cap and the left arm move, as offsets on top of whatever the idle loop and
// actions.js posed this frame (the gait also nods the cap, so these add to it). The tug takes
// back its own last offset first and then adds this frame's.

// RAISE: left arm thrown up (negative x); IN: arm swung across to the cap (z); YANK: the downward
// tug on the cap (arm pitch); SKEW: the cap crumpled to one side (z); DUCK: head tucked down (+x);
// GLANCE: size of each sideways jerk of the head (y).
export const RAISE = 2.3, IN = .5, YANK = .3, SKEW = .35, DUCK = .22, GLANCE = .6;
// Seconds for one tug.
export const TUG_LEN = 2.6;
// First tug after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 8;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const tugs = a => !!(a && !a.asset && a.quirk === 'gnome' && a.head && a.hat && Array.isArray(a.arms) && a.arms.length === 2);

const ZERO = () => ({raise: 0, across: 0, yank: 0, skew: 0, duck: 0, glance: 0});

// Phases in u: hand up .03-.15 (fast), held to .62, yank .12-.3, glances .35-.8 (left, right, left).
export function tugPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const held = win(u, .03, .66, .08);
  p.raise = RAISE * held * f;
  p.across = IN * held * f;
  // the hard pull down on the cap, then it stays pulled
  p.yank = YANK * (smooth((u - .12) / .06) - smooth((u - .62) / .06)) * f;
  p.skew = SKEW * (smooth((u - .14) / .07) - smooth((u - .7) / .15)) * f;
  p.duck = DUCK * held * f;
  // left, right, left: three short sharp jerks of the head, shrinking
  p.glance = GLANCE * (hump(u, .35, .47) - .8 * hump(u, .47, .6) + .6 * hump(u, .6, .72)) * f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not tugging.
export function updateGnomeTug(actor, dt, t, busy) {
  if (!tugs(actor)) return null;
  const st = actor.gnomeTug || (actor.gnomeTug = {seed: ((actor.g?.id ?? 1) * 49979687) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, hat, arms: [hand]} = actor, o = st.applied;
  hand.rotation.x += o.raise - o.yank; hand.rotation.z -= o.across;
  hat.rotation.z -= o.skew;
  head.rotation.x -= o.duck; head.rotation.y -= o.glance;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted tug always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / TUG_LEN;
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
  const p = tugPose(st.cur.u, st.f);
  hand.rotation.x -= p.raise - p.yank; hand.rotation.z += p.across;
  hat.rotation.z += p.skew;
  head.rotation.x += p.duck; head.rotation.y += p.glance;
  st.applied = p;
  return p;
}
