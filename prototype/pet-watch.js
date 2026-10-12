// A pet's fixed stare (canine.js quirk 'dog', feline.js quirk 'feline' flagged `petCat`). A standing
// pet near the hero keeps its face on them: the head swings round on a loose spring, overshoots,
// and settles a hair too exactly, never looking away. Walking, an action, death, a missing or
// invisible hero, or a hero out of range lets the head drift back to rest.
//
// Offset only: the head's yaw (rotation.y) is added on top of what the other layers wrote and
// taken back first next frame, so nothing drifts.
import {aimAt} from './glance.js';
export const MAX_YAW = .62, RANGE = 6, K = 70, C = 7;
const SNAP = 1e-3, STEP = 1 / 120;

export const watches = a => !!(a && !a.asset && a.head && (a.quirk === 'dog' || (a.quirk === 'feline' && a.petCat)));

// Target yaw for the hero, clamped, or 0 when out of range or behind.
export function targetYaw(actor, look) {
  const g = actor?.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return 0;
  const dx = look.x - g.position.x, dz = look.z - g.position.z;
  if (!(Math.hypot(dx, dz) > 1e-3) || Math.hypot(dx, dz) > RANGE) return 0;
  let yaw = Math.atan2(dx, dz) - g.rotation.y;
  yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  return Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw));
}

// Call once per frame after the gait layer. Returns the yaw offset applied.
export function updatePetWatch(actor, dt, t, busy, look = null) {
  if (!watches(actor)) return null;
  const st = actor.petWatch || (actor.petWatch = {y: 0, v: 0});
  actor.head.rotation.y -= st.y;
  dt = Number.isFinite(dt) ? Math.min(.1, Math.max(0, dt)) : 0;
  const still = !busy && !actor.actions?.dead;
  const goal = still ? targetYaw(actor, look) : 0;
  for (let s = 0; s < dt; s += STEP) {
    const h = Math.min(STEP, dt - s);
    st.v += (K * (goal - st.y) - C * st.v) * h;
    st.y += st.v * h;
  }
  if (!still && Math.abs(st.y) < SNAP && Math.abs(st.v) < SNAP) { st.y = 0; st.v = 0; }
  st.y = Math.max(-MAX_YAW * 1.4, Math.min(MAX_YAW * 1.4, st.y));
  actor.head.rotation.y += st.y;
  return st.y;
}
