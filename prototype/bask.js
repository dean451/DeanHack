// Idle basking gape for crocodiles. A crocodile that has lain still for a while now and then
// opens its jaws slowly and holds them open, the way real ones gape to cool off, breathing
// faintly through it, then lets them sink shut again. Walking, an action or death closes the
// mouth within ~0.1 s.
//
// The gape is an offset on the `jaw` handle (see jaw.js), on top of whatever actions.js has
// posed this frame. Call updateBask after updateActions: it takes back its own last offset
// first, so it never drifts, and it caps itself so action + bask never opens past JAW_GAPE.
// The head tips up a little as the jaw opens (SNOUT_LIFT at full gape), the way a basking
// crocodile raises its snout; it's the same kind of offset on `head`, taken back each frame.

import {JAW_GAPE} from './jaw.js';
import {updateUnicornSparkle} from './unicorn-sparkle.js';

// How wide the basking gape is, in radians, and its faint breath on top.
export const BASK_GAPE = .42, BASK_BREATH = .018;
// How far the snout tips up at full gape, in radians. Negative head.rotation.x lifts the snout (+z).
export const SNOUT_LIFT = .1;
// Seconds: the slow opening, the hold (HOLD_MIN..+HOLD_SPAN) and the close.
export const OPEN_S = 1.8, HOLD_MIN = 5, HOLD_SPAN = 4, CLOSE_S = 1.4;
// First gape after FIRST_MIN..+FIRST_SPAN s of lying still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 8, GAP_SPAN = 7;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Crocodiles are the only lizards with a jaw handle.
export const basks = a => !!(a?.jaw && a.quirk === 'lizard' && !a.asset);

// The gape at s seconds into a bask that holds for `hold` seconds; t drives the breath.
export function baskPose(s, hold, t = 0) {
  if (!(s > 0) || !(hold >= 0)) return 0;
  const open = smooth(s / OPEN_S), shut = smooth((s - OPEN_S - hold) / CLOSE_S);
  const e = open * (1 - shut);
  return e * (BASK_GAPE + BASK_BREATH * Math.sin(t * 1.9));
}
export const baskLength = hold => OPEN_S + hold + CLOSE_S;

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the offset applied this frame.
export function updateBask(actor, dt, t, busy) {
  // Unicorns sparkle, paw and toss their heads (unicorn-sparkle.js); it rides this call so live.js stays untouched.
  updateUnicornSparkle(actor, dt, t, busy);
  if (!basks(actor)) return 0;
  const st = actor.bask || (actor.bask = {seed: ((actor.g?.id ?? 1) * 104729) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: 0, lift: 0});
  actor.jaw.rotation.x -= st.applied;
  if (actor.head) actor.head.rotation.x += st.lift;
  st.applied = 0; st.lift = 0;
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const dead = !!actor.actions?.dead, still = !busy && !dead;
  if (st.cur) {
    // An interrupted bask always fades out; it never springs back open.
    if (still && !st.cur.broken) st.cur.s += dt;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.s >= baskLength(st.cur.hold) || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {s: 0, hold: HOLD_MIN + HOLD_SPAN * rand(st)}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return 0;
  const room = Math.max(0, JAW_GAPE - (actor.actions?.applied?.jaw || 0));
  const a = Math.min(room, baskPose(st.cur.s, st.cur.hold, t) * st.f);
  if (a > 0) { actor.jaw.rotation.x += a; st.applied = a; }
  // The lift follows the gape without its breath, so the head stays steady while the jaw breathes.
  const lift = SNOUT_LIFT * Math.min(1, baskPose(st.cur.s, st.cur.hold, 0) / BASK_GAPE) * st.f;
  if (actor.head && lift > 0) { actor.head.rotation.x -= lift; st.lift = lift; }
  return st.applied;
}
