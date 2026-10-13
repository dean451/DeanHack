// Idle gnash for beetles (beetle.js, flagged `beetle`). A beetle that has stood still for a few
// seconds now and then rears its head slowly back, trembling, as if something hung over it, then
// stabs down at the floor in three hard bites, the last one held with the head canted and shuddering,
// before it lets go. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head moves, as offsets on top of whatever the idle loop and actions.js posed this
// frame. The gnash takes back its own last offset first and then adds this frame's.

// REAR: head thrown back (negative x); STAB: the head driven down into the bites (positive x);
// CANT: the held bite's slant (z).
export const REAR = .3, STAB = .38, CANT = .3;
// RECOIL: after the held bite lets go the head snaps back past rest, as if spitting out the mouthful.
export const RECOIL = .14;
// Seconds for one gnash.
export const GNASH_LEN = 3;
// First gnash after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 4, FIRST_SPAN = 5, GAP_MIN = 9, GAP_SPAN = 9;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const gnashes = a => !!(a && !a.asset && a.beetle && a.head);

const ZERO = () => ({rear: 0, stab: 0, cant: 0});

// Phases in u: the head rears back .04-.34 with a fast tremble, then three stabs at .4, .52 and .64
// (each a hump .08 wide) and the last bite is held .66-.84 with the head canted and shuddering, then flung back .86-.97.
export function gnashPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const shake = Math.sin(u * 150);
  p.rear = REAR * (win(u, .04, .36, .12) * (1 + .12 * shake) - win(u, .36, .4, .02) * .1) * f;
  p.stab = STAB * (hump(u, .38, .46) + hump(u, .5, .58) + .6 * hump(u, .62, .7) + .5 * win(u, .64, .84, .04) * (1 + .15 * shake)) * f;
  p.rear += RECOIL * hump(u, .86, .97) * f;
  // The head has let go, and then it dips once more, small and late, at nothing: one last nibble.
  p.stab += STAB * .3 * hump(u, .975, .995) * f;
  p.cant = CANT * win(u, .66, .86, .06) * (1 + .3 * shake) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not gnashing.
export function updateBeetleGnash(actor, dt, t, busy) {
  if (!gnashes(actor)) return null;
  const st = actor.beetleGnash || (actor.beetleGnash = {seed: ((actor.g?.id ?? 1) * 40503719) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head} = actor, o = st.applied;
  head.rotation.x += o.rear - o.stab; head.rotation.z -= o.cant;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted gnash always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / GNASH_LEN;
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
  const p = gnashPose(st.cur.u, st.f);
  head.rotation.x -= p.rear - p.stab; head.rotation.z += p.cant;
  st.applied = p;
  return p;
}
