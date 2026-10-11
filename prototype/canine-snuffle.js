// Idle ground-snuffle for wild canines (canine.js, quirk 'canine'; pets keep their own wag). A
// jackal or wolf that has stood still for a few seconds now and then drops its nose to the dirt and
// worries along it, head swinging left and right, then freezes, snaps its head up and cocks it hard
// to one side, staring at something that is not there. Walking, an action or death fades it out
// within ~0.1 s.
//
// Only the head moves, as offsets on top of whatever the idle loop and actions.js posed this
// frame. The snuffle takes back its own last offset first and then adds this frame's.

// DIP: nose dropped to the ground (x); SWEEP: head swung along the trail (y); COCK: the head
// tilted over for the stare (z).
export const DIP = .5, SWEEP = .42, COCK = .5;
// Seconds for one snuffle.
export const SNUFFLE_LEN = 3;
// First snuffle after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 4, FIRST_SPAN = 4, GAP_MIN = 8, GAP_SPAN = 8;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);

export const snuffles = a => !!(a && !a.asset && a.quirk === 'canine' && a.head);

const ZERO = () => ({dip: 0, sweep: 0, cock: 0});

// Phases in u: the nose drops .06-.14 and stays down to .56, the head sweeps along the trail
// (two and a half swings) .14-.56, the head snaps up and the cock lands .6-.64 and is held to .88.
export function snufflePose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const trail = win(u, .14, .56, .04);
  p.dip = DIP * win(u, .06, .56, .08) * f;
  p.sweep = SWEEP * Math.sin((u - .14) / .42 * Math.PI * 5) * trail * f;
  p.cock = COCK * win(u, .6, .88, .05) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not snuffling.
export function updateCanineSnuffle(actor, dt, t, busy) {
  if (!snuffles(actor)) return null;
  const st = actor.canineSnuffle || (actor.canineSnuffle = {seed: ((actor.g?.id ?? 1) * 40503719) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head} = actor, o = st.applied;
  head.rotation.x -= o.dip; head.rotation.y -= o.sweep; head.rotation.z -= o.cock;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted snuffle always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / SNUFFLE_LEN;
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
  const p = snufflePose(st.cur.u, st.f);
  head.rotation.x += p.dip; head.rotation.y += p.sweep; head.rotation.z += p.cock;
  st.applied = p;
  return p;
}
