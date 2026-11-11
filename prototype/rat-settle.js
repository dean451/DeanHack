// An enormous, giant, rabid or sewer rat left alone in play, still and with the hero well away, balls up into the
// brown rat's hunch that rat-rest.js solves by role (belly low, back humped, feet tucked under, nose sunk to the
// forepaws, tail laid off to one side); when it moves, acts or the hero comes near it comes up, the head first.
// The hunch is baked (tools/bake-rat-rest.mjs writes rat-rest-poses.js). Called last from live-frame.js's actor
// loop through insect-settle.js's easing: each joint eases from wherever the frame left it (the sniff included)
// toward the resting value and the next call takes that back, so rising returns every joint exactly. After the hunch,
// the hero coming near (not beside it) sets off the nervous face wash (rat-washing.js), eased and taken back the same way.
import {REST_POSES} from './rat-rest-poses.js';
import {rests} from './rat-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';
import {applyWash} from './rat-washing.js';

export {rests};
export const FAMILY = ['enormous rat', 'giant rat', 'rabid rat', 'sewer rat'];

// The baked hunch for this rat (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that is not one of the rats.
export function updateRatSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !rests(a)) return 0;
  const st = a.ratRest || (a.ratRest = {p: 0, idle: 0, written: []});
  const wash = a.ratWash || (a.ratWash = {u: null, w: 0, written: []});
  // the wash was written last, so it is taken back first
  takeBackRest(wash); takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const p = applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
  applyWash(a, wash, dt, busy, look);
  return p;
}
