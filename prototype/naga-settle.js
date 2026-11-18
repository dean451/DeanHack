// A naga left alone in play (family N, stage 5 step 1): still and with the hero well away, it lets its reared front
// down and broods as a python lies in its coil (the rest naga-rest.js solves by role: the neck laid over the heap,
// the chin on the coil's scales); when it moves, acts or the hero comes near, the head comes up first and the neck
// rears again. The rest is baked (tools/bake-naga-rest.mjs writes naga-rest-poses.js). Called last from
// live-frame.js's actor loop through insect-settle.js's easing: each joint eases from wherever the frame left it
// toward the brooding value and the next call takes that back, so waking returns every joint exactly to its awake
// value. The neck's pivot (`actor.tail`, which tail-sway.js swings about z every frame) is eased back to its built
// angle with the neck, so the laid-down neck does not roll through the coil; tail-sway rewrites it each frame.
// After the rest, the hero coming near a naga that is up sets off the rear (naga-rearing.js), eased and taken back
// the same way.
import {REST_POSES} from './naga-rest-poses.js';
import {rests} from './naga-rest.js';
import {applyRest, takeBackRest, parts, NEAR} from './insect-settle.js';
import {applyRear} from './naga-rearing.js';

export {rests};

// The baked rest for this naga (by its name), or null when it has none that met every goal.
export function restFor(a) {
  const b = REST_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// The neck pivot's built roll (createNaga leaves it unturned; the rest was solved from there).
export const PIVOT_Z = 0;

// Called every frame for every actor; does nothing for a creature that is not a naga.
export function updateNagaSettle(a, dt, busy, look = null) {
  if (!a || a.asset || !a.joints || !restFor(a)) return 0;
  const st = a.nagaRest || (a.nagaRest = {p: 0, idle: 0, written: []});
  const rear = a.nagaRear || (a.nagaRear = {w: 0, written: []});
  // the rear was written last, so it is taken back first
  takeBackRest(rear); takeBackRest(st);
  if (st.can === undefined) st.can = rests(a);
  if (!st.can) return 0;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const p = applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
  const pivot = a.tail?.rotation;
  if (p && pivot) {
    const now = pivot.z, next = now + (PIVOT_Z - now) * parts(p).head;
    if (next !== now) { pivot.z = next; st.written.push({get: () => pivot.z, set: v => { pivot.z = v; }, left: next, was: now}); }
  }
  applyRear(a, rear, dt, busy, look, p);
  return p;
}
