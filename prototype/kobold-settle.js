// A kobold left alone in play, still and with the hero well away, sinks into the hunched crouch kobold-rest.js solves
// by role (pelvis low, feet close under it, hands on the knees, head carried low and forward); when it moves, acts or
// the hero comes near it straightens, the head first. The crouch is baked (tools/bake-kobold-rest.mjs writes
// kobold-rest-poses.js: the shaman's solve takes 7 s). Called last from live-frame.js's actor loop through
// insect-settle.js's easing: each joint eases from wherever the frame left it toward the resting value and the next
// call takes that back, so rising returns every joint and the body exactly to their awake values.
import {REST_POSES} from './kobold-rest-poses.js';
import {rests} from './kobold-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export {rests};

// The baked crouch for this kobold (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that does not crouch.
export function updateKoboldSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !rests(a)) return 0;
  const st = a.koboldRest || (a.koboldRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
}
