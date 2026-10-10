// A mummy's idle grope (mummy.js). A mummy that stands still now and then goes searching, as if
// it had lost the thing it was wrapped around: the head creaks slowly round to one side and then
// the other, the outstretched arms sweep wide apart feeling the dark, and then both drag back
// together and clutch at nothing. Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's turn (rotation.y) and the arms' sweep (rotation.z, opposite ways) and
// clutch (rotation.x) are added on top of whatever trudge.js and the action layer wrote, and taken
// back first next frame, so nothing drifts. Two-headed mummies turn both heads together.

// TURN: head yaw each way (rad); SWEEP: arm splay (rad); CLUTCH: arm pull in at the end (rad).
export const TURN = .6, SWEEP = .45, CLUTCH = .3;
// First grope after FIRST_MIN..+FIRST_SPAN s standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 5, GAP_SPAN = 8, GROPE_LEN = 4;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const gropes = a => !!(a && !a.asset && a.quirk === 'mummy' && a.head && a.arms?.length > 1 && a.body);

// The grope at progress u (0..1): {turn} -1..1 head yaw, {sweep} 0..1 arm splay, {clutch} 0..1.
// The head creaks left, then right, then home; the arms splay out through the middle and snap
// shut in a clutch just before the end. All exactly zero at both ends.
export function gropePose(u) {
  if (!(u > 0) || !(u < 1)) return {turn: 0, sweep: 0, clutch: 0};
  const env = smooth(u / .1) * (1 - smooth((u - .9) / .1));
  const turn = env * (Math.sin(u * Math.PI * 2 * 1.25) * (u < .8 ? 1 : 0) || 0);
  const sweep = smooth((u - .1) / .25) * (1 - smooth((u - .7) / .12));
  const clutch = smooth((u - .78) / .05) * (1 - smooth((u - .86) / .1));
  return {turn: clamp01(Math.abs(turn)) * Math.sign(turn), sweep, clutch};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the trudge layer. `busy` is true while the actor walks or acts.
export function updateMummyGrope(actor, dt, t, busy) {
  if (!gropes(actor)) return null;
  const st = actor.mummyGrope || (actor.mummyGrope = {seed: ((actor.g?.id ?? 1) * 31337) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {y: 0, z: 0, x: 0}});
  const o = st.o, heads = actor.heads || [actor.head], [l, r] = actor.arms;
  for (const h of heads) h.rotation.y -= o.y;
  l.rotation.z -= o.z; r.rotation.z += o.z; l.rotation.x -= o.x; r.rotation.x -= o.x;
  st.o = {y: 0, z: 0, x: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / GROPE_LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = gropePose(st.s), f = st.f;
  // the left arm (-x) splays with -z, the right with +z; a clutch pulls both arms down and in
  st.o = {y: TURN * p.turn * f, z: SWEEP * p.sweep * f, x: CLUTCH * p.clutch * f};
  for (const h of heads) h.rotation.y += st.o.y;
  l.rotation.z += st.o.z; r.rotation.z -= st.o.z; l.rotation.x += st.o.x; r.rotation.x += st.o.x;
  return p;
}
