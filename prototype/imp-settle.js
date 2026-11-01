// An imp, homunculus, quasit or tengu squatting in play: left alone, still and with the hero well away, it drops
// into the monkey's squat imp-rest.js solves by role (hips down, knees folded, back rounded, hands over the knees,
// head low); when it moves, acts or the hero comes near it rises, the head first. The squat is baked
// (tools/bake-imp-rest.mjs writes imp-rest-poses.js: a quasit's solve takes 3 s). Called last from live.js's actor
// loop through insect-settle.js's easing: each joint eases from wherever the frame left it toward the resting
// value and the next call takes that back, so rising returns every joint and the body exactly to their awake values.
import {REST_POSES} from './imp-rest-poses.js';
import {rests} from './imp-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export {rests};

// The baked squat for this imp (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that does not squat.
export function updateImpSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !rests(a)) return 0;
  const st = a.impRest || (a.impRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
}
