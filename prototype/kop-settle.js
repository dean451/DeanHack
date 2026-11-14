// A Keystone Kop, Kop Sergeant, Kop Lieutenant or Kop Kaptain left alone in play (family K, stage 5 step 1): still
// and with the hero well away, it eases into the stance at ease kop-rest.js solves by role (the left boot out, the
// weight between the feet, the hands clasped behind at the belt with the truncheon poking out behind the hip); when
// it moves, acts or the hero comes near it snaps back to attention, the head first. The stance is baked
// (tools/bake-kop-rest.mjs writes kop-rest-poses.js). Called last from live-frame.js's actor loop through
// insect-settle.js's easing: each joint eases from wherever the frame left it toward the resting value and the next
// call takes that back, so coming to attention returns every joint and the body exactly to their awake values.
import {REST_POSES} from './kop-rest-poses.js';
import {rests} from './kop-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export {rests};

// The baked stance for this Kop (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that is not a Kop.
export function updateKopSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !a.joints || !restFor(a)) return 0;
  const st = a.kopRest || (a.kopRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  if (st.can === undefined) st.can = rests(a);
  if (!st.can) return 0;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
}
