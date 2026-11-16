// A mummy left alone in play (family M, stage 5 step 1): still and with the hero well away, it folds its reaching
// arms back across its chest the way it was laid in the tomb (the rest mummy-rest.js solves by role: each bound hand
// across the breastbone, the right forearm over the left), and stands there like a coffin lid; when it moves, acts or
// the hero comes near, the arms come up off the chest and reach again. The rest is baked (tools/bake-mummy-rest.mjs
// writes mummy-rest-poses.js). Called last from live-frame.js's actor loop through insect-settle.js's easing: each
// joint eases from wherever the frame left it toward the laid-out value and the next call takes that back (the grope
// and the creak take it back first, since they run earlier in the frame: mummy-grope.js, mummy-creak.js), so waking
// returns every joint exactly to its awake value. After the rest, the hero coming near a mummy that is up sets off the
// lurch (mummy-lurching.js), eased and taken back the same way.
import {REST_POSES} from './mummy-rest-poses.js';
import {rests} from './mummy-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';
import {applyLurch} from './mummy-lurching.js';

export {rests};

// The baked rest for this mummy (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// Called every frame for every actor; does nothing for a creature that is not a mummy.
export function updateMummySettle(a, dt, busy, look = null) {
  if (!a || a.asset || !a.joints || !restFor(a)) return 0;
  const st = a.mummyRest || (a.mummyRest = {p: 0, idle: 0, written: []});
  const lurch = a.mummyLurch || (a.mummyLurch = {u: null, w: 0, written: []});
  // the lurch was written last, so it is taken back first
  takeBackRest(lurch); takeBackRest(st);
  if (st.can === undefined) st.can = rests(a);
  if (!st.can) return 0;
  // the rest is added to the angles the mummy was built with, taken on its first frame: the grope and the creak
  // swing the arms and head now and then while it stands, and one caught as the standing frame would hold them there
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const p = applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
  applyLurch(a, lurch, dt, busy, look, p);
  return p;
}
