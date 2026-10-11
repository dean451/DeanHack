// Idle head-cock for tengu (tengu.js). A tengu that has stood still for a few seconds now and
// then does what a crow does: the head jerks to one side, freezes, jerks to the other, freezes,
// as if weighing something small and doomed, and then the black wings flare half open and
// shiver shut again. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head's roll (rotation.z) and the wings' roll are offsets on top of whatever the idle
// loop and actions.js posed this frame. The cock takes back its own last offset first.

// COCK: head roll thrown to a side (z); FLARE: each wing lifted outward (z, mirrored by side).
export const COCK = .42, FLARE = .5;
// Seconds for one cock.
export const COCK_LEN = 2.6;
// First cock after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 4, FIRST_SPAN = 4, GAP_MIN = 9, GAP_SPAN = 8;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);

export const cocks = a => !!(a && !a.asset && a.quirk === 'tengu' && a.head && a.wings?.length === 2);

const ZERO = () => ({cock: 0, flare: 0});

// Phases in u: the head jerks to one side .06-.1 and is held to .3, jerks across to the other
// side .3-.34 (held to .55), then drops back .55-.59; the wings flare .62-.68, hold to .76 and
// shiver shut .76-.9 with one small re-flare. Exactly zero at both ends.
export function cockPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.cock = COCK * (win(u, .06, .3, .04) - win(u, .3, .55, .04)) * f;
  p.flare = FLARE * (win(u, .62, .76, .06) + .35 * win(u, .8, .86, .03)) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not cocking.
export function updateTenguCock(actor, dt, t, busy) {
  if (!cocks(actor)) return null;
  const st = actor.tenguCock || (actor.tenguCock = {seed: ((actor.g?.id ?? 1) * 22695477) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, wings} = actor, o = st.applied;
  head.rotation.z -= o.cock;
  for (const w of wings) w.rotation.z -= o.flare * (w.userData.side || 1);
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted cock always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / COCK_LEN;
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
  const p = cockPose(st.cur.u, st.f);
  head.rotation.z += p.cock;
  for (const w of wings) w.rotation.z += p.flare * (w.userData.side || 1);
  st.applied = p;
  return p;
}
