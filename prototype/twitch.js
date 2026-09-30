// Idle twitch for the skeleton. A skeleton that has stood still for a few seconds now and then
// snaps its skull round to one side, like something heard a noise: the skull jerks over and
// cocks, the bones rattle, it jerks a little further, holds, and snaps back to the front with
// another clatter. The shoulders jolt with each snap, and the jaw chatters: a burst of quick
// clacks after each snap, and it hangs a little slack while the skull holds the look. Walking, an action or death fades it out
// within ~0.1 s.
//
// Only the head (rotation x, y, z), jaw (rotation x, if the model has one) and arms (rotation x) move, as offsets on top of whatever
// trudge.js and actions.js posed this frame. Call updateTwitch after updateActions: it takes
// back its own last offset first, so it never drifts. The body is left alone, because the
// legs hang from it.

import {jawReach} from './jaw.js';

// YAW: the snap round (skull turns this far); NUDGE: the second, smaller jerk further round;
// COCK: head roll with the turn; DIP: head pitch down while it looks (+x tips the face down);
// RATTLE: size of the clatter after each snap (head roll); ARM: shoulder jolt (arms forward).
export const YAW = .5, NUDGE = .14, COCK = .13, DIP = .08, RATTLE = .06, ARM = .12;
// Seconds for one twitch; how long a snap takes; when the second jerk and the snap back start.
export const TWITCH_LEN = 2.2, SNAP_T = .09, NUDGE_AT = .75, NUDGE_T = .06, BACK_AT = 1.55;
// The clatter rings at RING_HZ and dies away by e^(-RING_DECAY·s); the jolt peaks JOLT_K⁻¹ s in.
export const RING_HZ = 14, RING_DECAY = 7, JOLT_K = 12;
// The jaw: CLACK is how far it flies open in a chatter (|sin| at CLACK_HZ, so it shuts twice per
// cycle and never closes past rest), dying away by e^(-CLACK_DECAY·s); the nudge chatters at
// CLACK_NUDGE of that. GAPE is the slack drop while the look is held, easing in over GAPE_T s.
// All in radians before jawReach (the skeleton's .5), which a positive x rotation opens.
export const CLACK = .22, CLACK_HZ = 14, CLACK_DECAY = 4, CLACK_NUDGE = .5, GAPE = .12, GAPE_AT = .3, GAPE_T = .35;
// First twitch after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 4, GAP_SPAN = 7;
const TAIL = .15, FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const ring = x => x > 0 ? Math.sin(2 * Math.PI * RING_HZ * x) * Math.exp(-RING_DECAY * x) : 0;
const clack = x => x > 0 ? Math.abs(Math.sin(Math.PI * CLACK_HZ * x)) * Math.exp(-CLACK_DECAY * x) : 0;
const jolt = x => x > 0 ? JOLT_K * x * Math.exp(1 - JOLT_K * x) : 0;

export const twitches = a => !!(a && !a.asset && a.species === 'skeleton' && a.head && a.body);

const ZERO = () => ({yaw: 0, cock: 0, dip: 0, rattle: 0, arm: 0, jaw: 0});

// The twitch's offsets s seconds in (0..TWITCH_LEN), turning to `side` (±1), scaled by f (0..1).
// Everything is 0 at s = 0 and at s = TWITCH_LEN.
export function twitchPose(s, side = 1, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(s > 0) || !(s < TWITCH_LEN)) return p;
  const w = (1 - smooth((s - (TWITCH_LEN - TAIL)) / TAIL)) * f;
  const back = smooth((s - BACK_AT) / SNAP_T);
  const e = smooth(s / SNAP_T) - back;
  const n = smooth((s - NUDGE_AT) / NUDGE_T) - back;
  p.yaw = side * (YAW * e + NUDGE * Math.max(0, n)) * w;
  p.cock = side * COCK * e * w;
  p.dip = DIP * e * w;
  p.rattle = RATTLE * (ring(s) + .6 * ring(s - NUDGE_AT) + ring(s - BACK_AT)) * w;
  p.arm = ARM * Math.max(jolt(s), jolt(s - BACK_AT)) * w;
  const gape = Math.max(0, smooth((s - GAPE_AT) / GAPE_T) - back);
  p.jaw = (CLACK * (clack(s) + CLACK_NUDGE * clack(s - NUDGE_AT) + clack(s - BACK_AT)) + GAPE * gape) * w;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not twitching.
export function updateTwitch(actor, dt, t, busy) {
  if (!twitches(actor)) return null;
  const st = actor.twitch || (actor.twitch = {seed: ((actor.g?.id ?? 1) * 32452843) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const h = actor.head, o = st.applied;
  h.rotation.x -= o.dip; h.rotation.y -= o.yaw; h.rotation.z -= o.cock + o.rattle;
  (actor.arms || []).forEach((a, i) => { if (i < 2) a.rotation.x += o.arm; });
  if (actor.jaw) actor.jaw.rotation.x -= o.jaw;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted twitch always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.s += dt;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.s >= TWITCH_LEN || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {s: 0, side: rand(st) < .5 ? -1 : 1}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = twitchPose(st.cur.s, st.cur.side, st.f);
  h.rotation.x += p.dip; h.rotation.y += p.yaw; h.rotation.z += p.cock + p.rattle;
  (actor.arms || []).forEach((a, i) => { if (i < 2) a.rotation.x -= p.arm; });
  // Smaller jaws open less (jaw.js); applied holds what was really added, so it comes back exactly.
  p.jaw *= jawReach(actor);
  if (actor.jaw) actor.jaw.rotation.x += p.jaw;
  st.applied = p;
  return p;
}
