// Idle sniff-and-startle for kobolds (kobold.js). A kobold that has stood still for a few seconds
// now and then catches a scent: the snout jerks up in four rapid sniffs, then the whole head snaps
// round to stare at nothing at all, and the tail lashes once behind it as if it knew something
// was there. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head and the tail move, as offsets on top of whatever the idle loop and actions.js
// posed this frame. The sniff takes back its own last offset first and then adds this frame's.

// SNIFF: snout thrown up on each sniff (negative x); STARE: the snap round to the unseen thing (y);
// LASH: the tail thrown sideways (z).
export const SNIFF = .22, STARE = .75, LASH = .7;
// CHECK: when the stare breaks the head flicks the other way past rest, to see what is behind it.
export const CHECK = .3;
// Seconds for one sniff.
export const SNIFF_LEN = 2.4;
// First sniff after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 4, GAP_MIN = 9, GAP_SPAN = 8;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const sniffs = a => !!(a && !a.asset && a.quirk === 'kobold' && a.head && a.tail);

const ZERO = () => ({sniff: 0, stare: 0, lash: 0});

// Phases in u: four sniffs .08-.42, the stare snaps round .46-.5 and is held to .82 and breaks in a flick the other way .84-.95, the tail
// lashes .5-.6 and rebounds (a small kick back) .6-.7.
export function sniffPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.sniff = SNIFF * (hump(u, .08, .17) + hump(u, .17, .26) + hump(u, .26, .34) + hump(u, .34, .42)) * f;
  p.stare = (STARE * win(u, .46, .82, .04) - CHECK * hump(u, .84, .95)) * f;
  // the tip twitches once more as the head flicks back, too late to be of use
  p.lash = LASH * (hump(u, .5, .6) - .3 * hump(u, .6, .7) + .25 * hump(u, .86, .92)) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not sniffing.
export function updateKoboldSniff(actor, dt, t, busy) {
  if (!sniffs(actor)) return null;
  const st = actor.koboldSniff || (actor.koboldSniff = {seed: ((actor.g?.id ?? 1) * 40503719) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, tail} = actor, o = st.applied;
  head.rotation.x += o.sniff; head.rotation.y -= o.stare; tail.rotation.z -= o.lash;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted sniff always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / SNIFF_LEN;
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
  const p = sniffPose(st.cur.u, st.f);
  head.rotation.x -= p.sniff; head.rotation.y += p.stare; tail.rotation.z += p.lash;
  st.applied = p;
  return p;
}
