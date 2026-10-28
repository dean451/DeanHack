// A jaguar, lynx, panther, tiger or displacer beast lying down in play: left alone, still and with the hero well
// away, it lowers onto its belly into the sphinx rest wildcat-rest.js solves by role (forelegs reached out ahead,
// hind feet folded in, head up, tail laid down); when it moves, acts or the hero comes near it gets up, the head
// first. The pose is baked (tools/bake-wildcat-rest.mjs writes wildcat-rest-poses.js) so nothing is solved
// mid-play (a solve takes 1 to 7 s). Called last from live.js's actor loop through insect-settle.js's easing: each
// joint eases from wherever the frame left it toward the resting value and the next call takes that back, so
// rising returns every joint and the body exactly to their awake values.
import {REST_POSES} from './wildcat-rest-poses.js';
import {rests} from './wildcat-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export {rests};

// The baked rest for this wild cat (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that does not lie down this way.
export function updateWildcatSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !rests(a)) return 0;
  const st = a.wildcatRest || (a.wildcatRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near && !(a.wildcatStalk?.p > 0), restFor);
}
