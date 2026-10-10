// A zombie's idle lull (zombie.js). A zombie that stands still now and then slumps: the lolling
// head sags further over onto its shoulder, slowly, as if the thing had forgotten it was upright,
// holds, and then jerks up in two stuttering snaps with the nearer arm spasming forward, as if
// something dead had remembered hunger. Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's roll (rotation.z) and pitch (rotation.x) and the right arm's lift
// (rotation.x) are added on top of whatever trudge.js and the action layer wrote, and taken back
// first next frame, so nothing drifts. Two-headed zombies sag both heads together.

// SAG: extra roll of the head (rad); NOD: extra pitch with it; SPASM: the arm's jerk (rad).
export const SAG = .35, NOD = .12, SPASM = .4;
// First lull after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 5, GAP_SPAN = 8, LULL_LEN = 3;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const lulls = a => !!(a && !a.asset && a.quirk === 'zombie' && a.head && a.arms?.length > 1 && a.body);

// The lull at progress u (0..1): {sag} 0..1 of the head's slump, {spasm} 0..1 of the arm jerk.
// The head sinks over the first half, holds, then comes up in two snaps at .62 and .7; the arm
// jerks with each snap. Both exactly zero at both ends.
export function lullPose(u) {
  if (!(u > 0) || !(u < 1)) return {sag: 0, spasm: 0};
  const sag = smooth(u / .5) * (1 - .55 * smooth((u - .62) / .03) - .45 * smooth((u - .7) / .03)) * (1 - smooth((u - .9) / .1));
  const jerk = c => Math.exp(-(((u - c) / .018) ** 2));
  return {sag, spasm: Math.min(1, jerk(.64) + .8 * jerk(.72))};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the trudge layer. `busy` is true while the actor walks or acts.
export function updateZombieLull(actor, dt, t, busy) {
  if (!lulls(actor)) return null;
  const st = actor.zombieLull || (actor.zombieLull = {seed: ((actor.g?.id ?? 1) * 22937) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {z: 0, x: 0, a: 0}});
  const o = st.o, arm = actor.arms[1], heads = actor.heads || [actor.head];
  for (const h of heads) { h.rotation.z -= o.z; h.rotation.x -= o.x; }
  arm.rotation.x -= o.a;
  st.o = {z: 0, x: 0, a: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / LULL_LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = lullPose(st.s), f = st.f;
  st.o = {z: SAG * p.sag * f, x: NOD * p.sag * f, a: -SPASM * p.spasm * f};
  for (const h of heads) { h.rotation.z += st.o.z; h.rotation.x += st.o.x; }
  arm.rotation.x += st.o.a;
  return p;
}
