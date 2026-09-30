// Idle skulk for the ghoul. A ghoul that has stood still for a few seconds now and then drops
// its skull low toward the ground and casts about for the scent of the dead: it sweeps its head
// slowly to one side and then the other, cocking it as it goes, and takes three short bursts of
// quick sniffs (little upward jerks of the snout) on the way. Its long arms draw forward a
// little, claws toward the floor. Walking, an action or death fades it out within ~0.1 s.
//
// Only the head (rotation x, y, z) and arms (rotation x) move, as offsets on top of whatever
// trudge.js and actions.js posed this frame. Call updateSkulk after updateActions: it takes
// back its own last offset first, so it never drifts. The body is left alone, because the
// ghoul's legs hang from it and tilting it would lift the feet off the floor.

// DIP: head pitch down at full skulk (+x tips the snout down); YAW: the side-to-side sweep;
// COCK: head roll with the sweep; SNIFF: size of each sniff jerk (snout up); ARM: arms reach
// forward (negative x, like their resting pitch).
export const DIP = .34, YAW = .38, COCK = .07, SNIFF = .045, ARM = .1;
// Seconds for one skulk; sniffs per second inside a burst.
export const SKULK_LEN = 4.4, SNIFF_RATE = 6.5;
// Centres (as progress u) and half-width of the three sniff bursts.
export const BURSTS = [.3, .5, .7], BURST_HALF = .085;
// First skulk after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 2.5, FIRST_SPAN = 4, GAP_MIN = 5, GAP_SPAN = 6;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const skulks = a => !!(a && !a.asset && a.species === 'ghoul' && a.head && a.body);

const ZERO = () => ({dip: 0, yaw: 0, cock: 0, sniff: 0, arm: 0});

// The skulk's offsets at progress u (0..1), scaled by f (0..1). Everything is 0 at u = 0 and 1.
export function skulkPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const e = (smooth(u / .18) - smooth((u - .82) / .18)) * f;
  const sweep = Math.sin(2 * Math.PI * u);
  p.dip = DIP * e;
  p.yaw = YAW * sweep * e;
  p.cock = COCK * sweep * e;
  p.arm = ARM * e;
  // Each burst fades in and out over its window; inside it the snout jerks up and eases back.
  let burst = 0;
  for (const c of BURSTS) burst = Math.max(burst, 1 - smooth(Math.abs(u - c) / BURST_HALF));
  if (burst > 0) {
    const ph = u * SKULK_LEN * SNIFF_RATE;
    p.sniff = SNIFF * burst * Math.pow(.5 - .5 * Math.cos(2 * Math.PI * ph), 2) * e;
  }
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not skulking.
export function updateSkulk(actor, dt, t, busy) {
  if (!skulks(actor)) return null;
  const st = actor.skulk || (actor.skulk = {seed: ((actor.g?.id ?? 1) * 15485863) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const h = actor.head, o = st.applied;
  h.rotation.x -= o.dip - o.sniff; h.rotation.y -= o.yaw; h.rotation.z -= o.cock;
  (actor.arms || []).forEach((a, i) => { if (i < 2) a.rotation.x += o.arm; });
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted skulk always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / SKULK_LEN;
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
  const p = skulkPose(st.cur.u, st.f);
  h.rotation.x += p.dip - p.sniff; h.rotation.y += p.yaw; h.rotation.z += p.cock;
  (actor.arms || []).forEach((a, i) => { if (i < 2) a.rotation.x -= p.arm; });
  st.applied = p;
  return p;
}
