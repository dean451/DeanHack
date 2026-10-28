// A dog, jackal, wolf or other canine curling up to sleep in play: left alone, still and with the hero well away,
// it lowers onto its belly into the curl canine-rest.js solves by role (legs folded under it, the muzzle by the
// haunch, the tail laid round); when it moves, acts, bows or the hero comes near it gets up, the head first.
// The pose is baked (tools/bake-canine-rest.mjs writes canine-rest-poses.js) so nothing is solved mid-play (a
// solve takes 0.2 to 4 s). Called last from live.js's actor loop through insect-settle.js's easing: each joint
// eases from wherever the frame left it toward the resting value and the next call takes that back, so rising
// returns every joint and the body exactly to their awake values.
import {REST_POSES} from './canine-rest-poses.js';
import {rests} from './canine-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export {rests};

// The baked curl for this canine (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that does not curl up. `look`: the hero's position.
export function updateCanineSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !rests(a)) return 0;
  const st = a.canineRest || (a.canineRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const bowing = !!a.canineBow && a.canineBow.phase !== 'idle';
  return applyRest(a, st, dt, !busy && !bowing && !a.actions?.dead && !near, restFor);
}
