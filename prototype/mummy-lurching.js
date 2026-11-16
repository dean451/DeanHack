// The mummies' lurch in play (family M, stage 5 step 2). A mummy standing still that finds the hero come near throws
// itself at him in the stiff-knee lurch (mummy-lurch.js, solved by role and baked by tools/bake-mummy-lurch.mjs into
// mummy-lurch-poses.js): the pelvis hiked, the stiff left leg dragged out ahead, the trunk pitched on over it and both
// bound arms flung up at his face, the whole body swung round toward him. It does not go in one movement: it jerks
// halfway out and catches, like a hinge rusted in the tomb, and only then gives and lunges the rest of the way. It
// hangs there reaching, then drags itself back upright slowly. Once as the hero arrives, then again AGAIN seconds after
// each while he stays; walking, acting or dying drops it within DROP. Called from mummy-settle.js after the laid-out
// rest, and only on a mummy fully up: each value eases from wherever the frame left it toward the lurch and the next
// call takes that back (mummy-settle.js, and mummy-grope.js and mummy-creak.js before their own), so ending or breaking
// off returns every joint and the body exactly.
import {LURCH_POSES} from './mummy-lurch-poses.js';
import {lurches} from './mummy-lurch.js';
import {NEAR} from './insect-settle.js';

// LEN: seconds the whole lurch takes; ALERT: seconds from the hero's arrival to the lurch; AGAIN: seconds after one
// ends before a hero who stays near sets off another; DROP: seconds it takes to drop when broken off; FACE: the most
// the body swings round toward the hero (radians).
export const LEN = 3.4, ALERT = .6, AGAIN = 9, DROP = .25, FACE = .7;
// the lurch's phases as shares of LEN: the first jerk out by JERK to CAUGHT of the way, caught still until GIVE, the
// lunge the rest of the way by OUT, held reaching until HELD, dragged back upright by 1
export const JERK = .04, CAUGHT = .5, GIVE = .14, OUT = .19, HELD = .52;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const wrap = v => Math.atan2(Math.sin(v), Math.cos(v));

// The baked lurch for this mummy (by its name), or null when it has none that met every goal.
export function lurchFor(a) {
  const b = LURCH_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// How far into the lurch it is at progress u (0..1), 0..1. Zero at both ends: a jerk out to CAUGHT, a dead catch, the
// lunge the rest of the way, the hold, then the long drag back, eased in and out.
export function lurchMotion(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  const out = CAUGHT * smooth(u / JERK) + (1 - CAUGHT) * smooth((u - GIVE) / (OUT - GIVE));
  return clamp01(out * (1 - smooth((u - HELD) / (1 - HELD))));
}

// Called by mummy-settle.js every frame, after the rest and after taking back last frame's lurch (`st.written`).
// `resting`: how far the laid-out rest is in (0 up). Returns how far into the lurch it is (0..1).
export function applyLurch(a, st, dt, busy, look, resting = 0) {
  if (!a || a.asset || !a.joints || !lurches(a) || !lurchFor(a)) return 0;
  const seen = !!look && Number.isFinite(look.x) && Number.isFinite(look.z);
  const near = seen && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const still = !busy && !a.actions?.dead;
  if (st.u == null) {
    if (!near) { st.wait = null; return 0; }
    if (st.wait == null) st.wait = ALERT;
    if (still && !(resting > 0)) st.wait -= dt;
    if (st.wait > 0 || !still || resting > 0) return 0;
    // the way to the hero, in the mummy's own frame, fixed for the whole lurch
    const bearing = wrap(Math.atan2(look.x - a.g.position.x, look.z - a.g.position.z) - a.g.rotation.y);
    st.u = 0; st.w = 0; st.broken = false; st.wait = AGAIN; st.face = Math.max(-FACE, Math.min(FACE, bearing));
  }
  if (!still || st.broken) { st.broken = true; st.w = Math.max(0, st.w - dt / DROP); }
  else st.u += dt / LEN;
  if (st.u >= 1 || (st.broken && st.w <= 0)) { st.u = null; st.w = 0; st.broken = false; return 0; }
  if (!st.broken) st.w = lurchMotion(st.u);
  const pose = lurchFor(a), w = st.w;
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  if (!a.jointRest.turn) a.jointRest.turn = {y: a.body.rotation.y};
  if (!a.jointRest.roll) a.jointRest.roll = {z: a.body.rotation.z};
  const {rest, body, turn, roll} = a.jointRest;
  const ease = (obj, ax, target) => {
    const now = obj[ax], next = now + (target - now) * w;
    if (next === now) return;
    obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now});
  };
  // only the joints the lurch moves: the head and anything else stay as the frame left them
  for (const [n, p] of Object.entries(pose)) {
    const o = a.joints[n];
    if (!o || typeof p !== 'object' || n === 'body') continue;
    for (const ax of ['x', 'y', 'z']) if (p[ax]) ease(o.rotation, ax, rest[n][ax] + p[ax]);
  }
  ease(a.body.position, 'y', body.y + (pose.hipsY || 0));
  ease(a.body.rotation, 'z', roll.z + (pose.body?.z || 0));
  ease(a.body.rotation, 'y', turn.y + st.face);
  return w;
}
