// A rothe, mumak, mastodon, titanothere, baluchitherium, leocrotta or wumpus left standing with the hero near throws
// its head up and forward, the bull's and elephant's raised head (quadruped-charge.js solves the pose by role, baked
// by tools/bake-quadruped-charge.mjs into quadruped-charge-poses.js): a heavy snap up, a held stare, then the head
// settles back slowly under its own weight. Set off by the hero (no source gave a period, so the times are set by
// eye); it never starts on a beast that is walking, acting, dead or lying down, and walking, an action, death or
// lying down takes it back within a moment.
//
// Offsets only: the neck's pitch (rotation.x) is added on top of whatever the frame wrote and taken back first next
// frame, so nothing drifts and every joint comes back exactly.
import {CHARGE_POSES} from './quadruped-charge-poses.js';
import {charges} from './quadruped-charge.js';

export const FAMILY = ['rothe', 'mumak', 'mastodon', 'titanothere', 'baluchitherium', 'leocrotta', 'wumpus'];
// NEAR: how close the hero may come (metres) before it throws; ALERT: seconds from his arrival to the first throw;
// GAP: seconds between throws while he stays; LEN: seconds one throw takes (snap up, hold, settle back).
export const NEAR = 4, ALERT = .7, GAP = 7, LEN = 3.2;
const SNAP = 1e-3, FADE_OUT = 10;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The baked thrown head for this beast (by its name), or null when it has none that met every goal.
export function throwFor(a) {
  const b = CHARGE_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// How far the head is thrown at progress u (0..1): a quick snap up, a hold with a slight tremor of effort, a long
// slow settle. Zero at both ends.
export function throwPose(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  const up = smooth(u / .12), down = smooth((u - .5) / .5);
  return Math.max(0, Math.min(1, up * (1 - down) + Math.sin(u * 60) * .02 * up * (1 - down)));
}

export const throws = a => !!(a && !a.asset && charges(a) && a.joints?.neck0 && throwFor(a));

// Call once per frame after the gait layer and before quadruped-settle.js. `busy` is true while the actor walks or
// acts; `look` is the hero ({x, z}). Returns the throw's progress (0..1 of the pose), 0 when idle.
export function updateQuadrupedThrow(a, dt, busy, look = null) {
  if (!a || a.asset || !a.joints?.neck0) return 0;
  const st = a.quadrupedThrow || (a.quadrupedThrow = {wait: 0, s: null, f: 0, o: 0, broken: false});
  const neck = a.joints.neck0;
  // (a value nothing else rewrote goes back to exactly what it was; one something else rewrote loses only the offset)
  if (st.o) neck.rotation.x = neck.rotation.x === st.left ? st.was : neck.rotation.x - st.o;
  st.o = 0;
  if (!throws(a)) return 0;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const lying = (a.quadrupedRest?.p || 0) > 0;
  const still = !busy && !a.actions?.dead && !lying;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 8);
  } else if (still && near) {
    if (!st.alerted) { st.alerted = true; st.wait = ALERT; }
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.wait = GAP; }
  } else if (!near) st.alerted = false;
  if (st.s == null) return 0;
  const p = throwPose(st.s);
  st.o = (throwFor(a).neck0?.x || 0) * p * st.f;
  st.was = neck.rotation.x; neck.rotation.x += st.o; st.left = neck.rotation.x;
  return p * st.f;
}
