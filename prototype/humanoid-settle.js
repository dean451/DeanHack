// A hobbit, dwarf, bugbear, goblin or orc sitting in play: left alone, still and with the hero well away, it slumps
// to the floor in the sit humanoid-rest.js solves by role (pelvis down, heels out ahead, back stooped, head hung low,
// hands on the thighs); when it moves, acts or the hero comes near it gets up, the head first. The sit is baked
// (tools/bake-humanoid-rest.mjs writes humanoid-rest-poses.js: a goblin king's solve takes 16 s). Called last from
// live-frame.js's actor loop through insect-settle.js's easing: each joint eases from wherever the frame left it
// toward the resting value and the next call takes that back, so rising returns every joint and the body exactly
// to their awake values.
import {REST_POSES} from './humanoid-rest-poses.js';
import {rests} from './humanoid-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export {rests};

// The baked sit for this humanoid (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that does not sit.
export function updateHumanoidSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !a.joints || !restFor(a)) return 0;
  const st = a.humanoidRest || (a.humanoidRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  // whether it sits at all is judged once, standing: `rests` measures the pelvis, which moves once it has sat
  if (st.can === undefined) st.can = rests(a);
  if (!st.can) return 0;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
}
