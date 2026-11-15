// A lich, demilich, master lich or arch-lich left alone in play (family L, stage 5 step 1): still and with the hero
// well away, it sinks into the stoop lich-rest.js solves by role (bowed at the waist over its planted staff, the free
// hand hanging plumb); when it moves, acts or the hero comes near it straightens, the skull first. The stoop is baked
// (tools/bake-lich-rest.mjs writes lich-rest-poses.js). Called last from live-frame.js's actor loop through
// insect-settle.js's easing: each joint eases from wherever the frame left it toward the stooped value and the next
// call takes that back, so straightening returns every joint exactly to its awake value.
import {REST_POSES} from './lich-rest-poses.js';
import {rests} from './lich-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export {rests};

// The baked stoop for this lich (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that is not a lich.
export function updateLichSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !a.joints || !restFor(a)) return 0;
  const st = a.lichRest || (a.lichRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  if (st.can === undefined) st.can = rests(a);
  if (!st.can) return 0;
  // the stoop is added to the angles the lich was built with, taken on its first frame: lich-chill.js lifts the free
  // arm in a grasp now and then, and a grasp caught as the standing frame would hold that arm up through the stoop
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
}
