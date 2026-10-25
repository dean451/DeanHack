// A chickatrice, cockatrice or pyrolisk settling to rest in play: left alone, still and with the hero well away,
// it lowers itself into the hen's pose cockatrice-rest.js solves by role (breast on the floor, feet folded under
// it, beak down, wings drawn in); when it moves, acts or the hero comes near it rises, the head first. Called last
// from live.js's actor loop, after everything else has written the frame, through insect-settle.js's easing: each
// joint eases from wherever the frame left it toward the resting value, and the next call takes that back, so
// rising returns every joint exactly to its awake value.
import {restPose} from './cockatrice-rest.js';
import {applyRest, takeBackRest, NEAR} from './insect-settle.js';

export const rests = a => !!(a && !a.asset && a.quirk === 'cockatrice' && a.joints?.neck0 && a.joints.lwing);

const POSES = new Map();
// The solved resting pose for this kind of bird (cached by name), or null when it did not meet every goal.
export function restFor(a) {
  const key = `${a.species || a.name || ''}:${a.g.scale.x}`;
  if (!POSES.has(key)) {
    const r = restPose(a), worst = Math.max(...r.residuals.map(v => Math.hypot(...(Array.isArray(v) ? v : [v]))));
    POSES.set(key, worst < .02 ? r.pose : null);
  }
  return POSES.get(key);
}

// Called every frame for every actor; does nothing for a creature that is not a cockerel.
export function updateCockatriceSettle(a, dt, busy, look = null) {
  if (!rests(a)) return 0;
  const st = a.fowlRest || (a.fowlRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near, restFor);
}
