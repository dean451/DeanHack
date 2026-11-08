// A rothe, mumak, mastodon, titanothere, baluchitherium, leocrotta or wumpus left alone in play, still and with the
// hero well away, folds its legs under it and lies down sternal, as quadruped-rest.js solves by role (belly on the
// floor, feet tucked, head held up); when it moves, acts or the hero comes near it heaves up, the head first. The
// lying pose is baked (tools/bake-quadruped-rest.mjs writes quadruped-rest-poses.js). Called last from
// live-frame.js's actor loop through insect-settle.js's easing: each joint eases from wherever the frame left it
// toward the resting value and the next call takes that back, so rising returns every joint exactly.
import {REST_POSES} from './quadruped-rest-poses.js';
import {rests} from './quadruped-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export {rests};
export const FAMILY = ['rothe', 'mumak', 'mastodon', 'titanothere', 'baluchitherium', 'leocrotta', 'wumpus'];

// The baked lying pose for this beast (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that does not lie down this way.
export function updateQuadrupedSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !rests(a)) return 0;
  const st = a.quadrupedRest || (a.quadrupedRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
}
