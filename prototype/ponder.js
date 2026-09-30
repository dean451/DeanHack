// Idle brooding for mind flayers (mind-flayer.js). A flayer that has stood still for a few
// seconds now and then ponders: its long three-fingered hands come up and steeple together in
// front of its waist, below the tentacles, and the fingertips tap against each other; its head
// cocks to one side and dips a little, as if weighing the hero's brain; and its face tentacles
// curl up and slowly writhe. Then the hands part and fall back to its sides. Walking, an action or
// death fades it out within ~0.1 s.
//
// Only the arms, the head and the tentacles (tail pitch) move, as offsets on top of whatever the
// idle loop and actions.js posed this frame. live.js writes the tentacles' sway (rotation.z)
// absolutely, and actions.js works in offsets, so the ponder takes back its own last offset first
// and then adds this frame's. The body is left alone, because the legs hang from it.

// REACH: both arms brought forward (negative x); INWARD: each arm rolled in towards the middle so
// the hands meet; TAP: the fingertip tapping (inward roll); TILT: head cocked (roll); GAZE: head
// dipped (positive x); CURL: tentacles curled up and forward (negative x); WRITHE: their slow
// writhe on top (pitch).
export const REACH = .8, INWARD = .55, TAP = .05, TILT = .15, GAZE = .08, CURL = .42, WRITHE = .1;
// Seconds for one ponder; taps per second while steepled; writhes per second.
export const PONDER_LEN = 5.2, TAP_RATE = 2.4, WRITHE_RATE = 1.1;
// First ponder after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 5, FIRST_SPAN = 4, GAP_MIN = 9, GAP_SPAN = 9;
const FADE_OUT = 14, SNAP = 1e-3;
const FLAYERS = new Set(['mind flayer', 'master mind flayer']);

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// 1 between a and b, easing in and out over `edge` either side; 0 outside.
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);

export const ponders = a => !!(a && !a.asset && FLAYERS.has(a.species) && a.head && a.tail && a.arms?.length >= 2);

const ZERO = () => ({reach: 0, inward: 0, tilt: 0, gaze: 0, curl: 0});

// Phases in u: hands up and together .04–.18, steepled (tapping .22–.74) to .8, down by .94. The head
// and tentacles run a little behind the hands on the way in and ahead of them on the way out.
const HOLD_FROM = .04, HOLD_TO = .8, EDGE = .14, TAP_FROM = .22, TAP_TO = .74;

// The ponder's offsets at progress u (0..1), scaled by f (0..1). Everything is 0 at u = 0 and 1.
export function ponderPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const hands = win(u, HOLD_FROM, HOLD_TO, EDGE);
  // taps: the fingertips part a touch and meet again (never pass through each other)
  const tapping = win(u, TAP_FROM, TAP_TO, .04);
  const tap = TAP * tapping * Math.sin(Math.PI * TAP_RATE * PONDER_LEN * (u - TAP_FROM)) ** 2;
  p.reach = REACH * hands * f;
  p.inward = (INWARD * hands - tap) * f;
  const mood = win(u, .12, .8, .12);
  p.tilt = TILT * mood * f;
  p.gaze = GAZE * mood * f;
  // curl up, writhing; the writhe only ever lifts them further, so it never drops them back in
  const writhe = WRITHE * mood * .5 * (1 - Math.cos(2 * Math.PI * WRITHE_RATE * PONDER_LEN * (u - .12)));
  p.curl = (CURL * mood + writhe) * f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not pondering.
export function updatePonder(actor, dt, t, busy) {
  if (!ponders(actor)) return null;
  const st = actor.ponder || (actor.ponder = {seed: ((actor.g?.id ?? 1) * 40503) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, tail, arms} = actor, [left, right] = arms, o = st.applied;
  left.rotation.x += o.reach; right.rotation.x += o.reach;
  left.rotation.z -= o.inward; right.rotation.z += o.inward;
  head.rotation.z -= o.tilt; head.rotation.x -= o.gaze; tail.rotation.x += o.curl;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted ponder always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / PONDER_LEN;
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
  const p = ponderPose(st.cur.u, st.f);
  left.rotation.x -= p.reach; right.rotation.x -= p.reach;
  left.rotation.z += p.inward; right.rotation.z -= p.inward;
  head.rotation.z += p.tilt; head.rotation.x += p.gaze; tail.rotation.x -= p.curl;
  st.applied = p;
  return p;
}
