// Idle spasm for the zombie (and ghoul; the skeleton, which shares the rig, has twitch.js). A zombie that has stood still for a few seconds now and then
// remembers it is meant to be hungry: the lolling head hauls itself up and round with a wet
// jerk, the nearer arm lifts and claws twice at nothing, and then everything gives out at once
// and the head drops back to its slump. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head (rotation x, z) and arms (rotation x) move, as offsets on top of whatever
// trudge.js and actions.js posed this frame. Call updateZombieTwitch after updateActions: it
// takes back its own last offset first, so it never drifts. The body is left alone, because the
// legs hang from it.

// LIFT: head pitched back up out of its slump (-x); CRANE: head roll toward the side it looks;
// REACH: the clawing arm's lift; CLAW: the size of each claw-snatch; DROP: head overshoot down
// when it gives out.
export const LIFT = .3, CRANE = .35, REACH = .5, CLAW = .18, DROP = .12;
export const SPASM_LEN = 2.4, HAUL_T = .12, CLAW_AT = .55, CLAW_GAP = .32, GIVE_AT = 1.5, GIVE_T = .08;
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 5, GAP_SPAN = 8;
const TAIL = .15, FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// A snatch: a quick close and a slower open, 0..1..0 over .28 s.
const snatch = x => x <= 0 || x >= .28 ? 0 : x < .08 ? smooth(x / .08) : 1 - smooth((x - .08) / .2);

export const zombieTwitches = a => !!(a && !a.asset && a.quirk === 'zombie' && a.species !== 'skeleton' && a.head && Array.isArray(a.arms) && a.arms.length === 2);

const ZERO = () => ({lift: 0, crane: 0, reach: 0, claw: 0, drop: 0});

// The spasm's offsets s seconds in (0..SPASM_LEN), craning toward `side` (±1), scaled by f (0..1).
// Everything is 0 at s = 0 and at s = SPASM_LEN.
export function zombieTwitchPose(s, side = 1, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(s > 0) || !(s < SPASM_LEN)) return p;
  const w = (1 - smooth((s - (SPASM_LEN - TAIL)) / TAIL)) * f;
  const give = smooth((s - GIVE_AT) / GIVE_T);
  const up = smooth(s / HAUL_T) - give;
  p.lift = LIFT * up * w;
  p.crane = side * CRANE * up * w;
  p.reach = REACH * (smooth((s - .35) / .2) - smooth((s - GIVE_AT) / .12)) * w;
  p.claw = CLAW * (snatch(s - CLAW_AT) + snatch(s - CLAW_AT - CLAW_GAP)) * w;
  // it gives out: the head overshoots its slump, then settles
  p.drop = DROP * give * (1 - smooth((s - GIVE_AT - GIVE_T) / .35)) * w;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not twitching.
export function updateZombieTwitch(actor, dt, t, busy) {
  if (!zombieTwitches(actor)) return null;
  const st = actor.zombieTwitch || (actor.zombieTwitch = {seed: ((actor.g?.id ?? 1) * 22695477) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO(), arm: 0});
  const h = actor.head, o = st.applied;
  h.rotation.x += o.lift - o.drop; h.rotation.z -= o.crane;
  actor.arms[st.arm].rotation.x += o.reach + o.claw;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    if (still && !st.cur.broken) st.cur.s += dt;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.s >= SPASM_LEN || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {s: 0, side: rand(st) < .5 ? -1 : 1}; st.arm = st.cur.side > 0 ? 1 : 0; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = zombieTwitchPose(st.cur.s, st.cur.side, st.f);
  h.rotation.x -= p.lift - p.drop; h.rotation.z += p.crane;
  actor.arms[st.arm].rotation.x -= p.reach + p.claw;
  st.applied = p;
  return p;
}
