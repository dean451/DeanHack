// A walking pet checks on the hero (canine.js quirk 'dog', feline.js quirk 'feline' flagged
// `petCat`). Every few steps its head snaps round to the hero in one hard jerk, holds the stare a
// beat too long, then drops back to the way it was going, as if counting you. Standing still
// belongs to pet-watch.js; an action, death, a missing hero or one out of range cancels it.
//
// Offset only: the head's yaw (rotation.y) is added on top of what the other layers wrote and
// taken back first next frame, so nothing drifts.
import {watches, targetYaw} from './pet-watch.js';
export const MAX_YAW = .75, RANGE = 8, GAP_MIN = 2.2, GAP_SPAN = 3.6, SNAP_IN = .08, HOLD = .55, EASE_OUT = .22;
const FADE = 14, EPS = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Glance strength 0..1 at time s into a glance: a fast snap in, a hold, an easy return.
export function glanceCurve(s) {
  if (!(s > 0)) return 0;
  if (s < SNAP_IN) return smooth(s / SNAP_IN);
  if (s < SNAP_IN + HOLD) return 1;
  return 1 - smooth((s - SNAP_IN - HOLD) / EASE_OUT);
}
export const glanceLen = () => SNAP_IN + HOLD + EASE_OUT;

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `walking` is true while the pet moves with no action.
export function updatePetGlance(actor, dt, t, busy, walking, look = null) {
  if (!watches(actor)) return null;
  const st = actor.petGlance || (actor.petGlance = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, y: 0});
  actor.head.rotation.y -= st.y;
  st.y = 0;
  dt = Number.isFinite(dt) ? Math.min(.1, Math.max(0, dt)) : 0;
  const goal = walking && !actor.actions?.dead ? targetYaw({g: actor.g}, look) : 0;
  const clamped = Math.max(-MAX_YAW, Math.min(MAX_YAW, goal * 1.2));
  if (!st.wait) st.wait = GAP_MIN + GAP_SPAN * rand(st);
  if (st.s != null) {
    if (goal !== 0) { st.s += dt; st.aim = clamped; if (st.s >= glanceLen()) st.s = null; }
    else { st.f *= Math.exp(-FADE * dt); if (st.f < EPS) st.s = null; }
    if (st.s != null && goal !== 0) st.f = glanceCurve(st.s);
  } else if (goal !== 0) {
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.aim = clamped; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) { st.f = 0; return null; }
  st.y = (st.aim || 0) * st.f;
  actor.head.rotation.y += st.y;
  return st.y;
}
