// Idle sword salute for the knight, whose model (knight.js) holds an arming sword upright in its
// right fist and a heater shield on its left forearm. A knight that has stood still for a few
// seconds now and then salutes: it brings the hilt up before its visor with the blade standing
// straight up, squaring the shield a little forward, and bows its head over the cross-guard; then
// it sweeps the blade forward and down, point lowered to the floor at its front right, holds it
// there a moment, and raises it back to rest at its side. Walking, an action or death fades it out
// within ~0.1 s.
//
// Only the head, the two arms and the weapon socket (pitch) move, as offsets on top of whatever
// the idle loop and actions.js posed this frame. Nothing else writes these parts absolutely each
// frame (actions.js also works in offsets), so the salute takes back its own last offset first
// and then adds this frame's.

// Key poses, as offsets from rest: `arm` pitch (negative raises forward), `roll` (negative swings
// the hand in toward the chest), `pitch` of the socket (positive tips the blade forward).
// HILT: the hilt before the visor, blade upright; LOW: the point lowered to the floor, front right.
export const HILT = {arm: -1.9, roll: -.5, pitch: 1.9}, LOW = {arm: -.5, roll: .1, pitch: 2.7};
// BOW: the head's bow over the hilt (positive rotation.x nods down); SHIELD: the shield arm
// squared forward (negative x) through the salute.
export const BOW = .16, SHIELD = .22;
// PEER: the two quick nods down at the lowered point (the second a little shallower).
export const PEER = .12;
// Seconds for one salute.
export const SALUTE_LEN = 3.6;
// First salute after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 6, FIRST_SPAN = 4, GAP_MIN = 12, GAP_SPAN = 10;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// A rise-and-fall bump over [a, b], 0 at both ends, peaking at 1.
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) ** 2 : 0; };

export const salutes = a => !!(a && !a.asset && a.kind === 'knight' && a.head && a.arm && a.weaponSocket && a.shieldArm);

const ZERO = () => ({arm: 0, roll: 0, pitch: 0, bow: 0, shield: 0});

// Phases in u: up to the hilt .04–.24, held (with the bow) to .44, swept down to the point by .6,
// held to .76, back to rest by .95.
export function salutePose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const up = smooth((u - .04) / .2), sweep = smooth((u - .44) / .16), home = smooth((u - .76) / .19);
  for (const k of ['arm', 'roll', 'pitch']) p[k] = (HILT[k] * up + (LOW[k] - HILT[k]) * sweep - LOW[k] * home) * f;
  p.bow = (BOW * hump(u, .24, .44) + PEER * (hump(u, .6, .68) + .6 * hump(u, .68, .76))) * f;
  p.shield = SHIELD * (smooth((u - .04) / .2) - smooth((u - .78) / .17)) * f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not saluting.
export function updateSalute(actor, dt, t, busy) {
  if (!salutes(actor)) return null;
  const st = actor.salute || (actor.salute = {seed: ((actor.g?.id ?? 1) * 48271) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, arm, shieldArm, weaponSocket: socket} = actor, o = st.applied;
  arm.rotation.x -= o.arm; arm.rotation.z -= o.roll; socket.rotation.x -= o.pitch;
  head.rotation.x -= o.bow; shieldArm.rotation.x += o.shield;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted salute always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / SALUTE_LEN;
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
  const p = salutePose(st.cur.u, st.f);
  arm.rotation.x += p.arm; arm.rotation.z += p.roll; socket.rotation.x += p.pitch;
  head.rotation.x += p.bow; shieldArm.rotation.x -= p.shield;
  st.applied = p;
  return p;
}
