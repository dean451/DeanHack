// A gnome, gnome lord, gnome king or gnomish wizard left alone in play (family G, stage 5 step 1): still and with the
// hero well away, it slumps to the floor in the sit gnome-rest.js solves by role (pelvis down, the stubby legs out
// ahead, back stooped, the big head hung over the beard, hands on the thighs); when it moves, acts or the hero comes
// near it gets up, the head first. The sit is baked (tools/bake-gnome-rest.mjs writes gnome-rest-poses.js). Called
// last from live-frame.js's actor loop through insect-settle.js's easing: each joint eases from wherever the frame left
// it (the cap-tug included, which takes this back first: gnome-tug.js) toward the resting value and the next call takes
// that back, so rising returns every joint and the body exactly to their awake values. After the slump, the hero
// coming near a gnome that is up sets off the waddle (gnome-waddling.js), eased and taken back the same way.
import {REST_POSES} from './gnome-rest-poses.js';
import {rests} from './gnome-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';
import {applyWaddle} from './gnome-waddling.js';

export {rests};

// The baked sit for this gnome (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that is not a gnome.
export function updateGnomeSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !a.joints || !restFor(a)) return 0;
  const st = a.gnomeRest || (a.gnomeRest = {p: 0, idle: 0, written: []});
  const waddle = a.gnomeWaddle || (a.gnomeWaddle = {u: null, w: 0, written: []});
  // the waddle was written last, so it is taken back first
  takeBackRest(waddle); takeBackRest(st);
  // whether it sits at all is judged once, standing: `rests` measures the pelvis, which moves once it has sat
  if (st.can === undefined) st.can = rests(a);
  if (!st.can) return 0;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const p = applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
  applyWaddle(a, waddle, dt, busy, look, p);
  return p;
}
