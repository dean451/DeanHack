// An ant, beetle, locust or bee settling to rest in play: left alone, still and with the hero well away, it lowers
// itself into the pose insect-rest.js (ants, beetles, locust) or bee-rest.js (bees) solves by role; when it moves,
// acts or the hero comes near it rises, the head first. Called last from live.js's actor loop, after everything
// else has written the frame: it eases each joint from wherever the frame left it toward the resting value, and
// takes that back at the start of the next call, so rising returns every joint exactly to its awake value.
import {restPose as groundRest, rests as groundRests} from './insect-rest.js';
import {restPose as beeRest, rests as beeRests} from './bee-rest.js';

// SETTLE: seconds of stillness before it starts to settle (a honeybee sleeps still for up to half an hour, so
// not long: creature-measures.js, Insects); SETTLING and RISE: how many seconds settling and rising take;
// NEAR: how close the hero may come (metres) before it gets up.
export const SETTLE = 8, SETTLING = 2.2, RISE = .5, NEAR = 4;

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
// How far each part is settled at progress p (0 awake, 1 resting): the legs fold and the body sinks first, the
// head last; rising runs it backward, so the head lifts first.
export const parts = p => ({body: smooth(p / .7), head: smooth((p - .4) / .6)});
const region = n => /^neck|^head|jaw|wing/.test(n) ? 'head' : 'body';

const POSES = new Map();
// The solved resting pose for this kind of creature (cached by name), or null when it has none that met every goal.
export function restFor(a) {
  const solve = groundRests(a) ? groundRest : beeRests(a) ? beeRest : null;
  if (!solve) return null;
  const key = `${a.species || a.name || ''}:${a.g.scale.x}`;
  if (!POSES.has(key)) {
    const r = solve(a), worst = Math.max(...r.residuals.map(v => Math.hypot(...(Array.isArray(v) ? v : [v]))));
    POSES.set(key, worst < .02 ? r.pose : null);
  }
  return POSES.get(key);
}

// Undoes last frame's easing, the last write first. A value something else rewrote since is left alone; one only
// the settling touched goes back exactly.
export function takeBackRest(st) {
  const list = st.written || [];
  for (let i = list.length - 1; i >= 0; i--) { const w = list[i]; if (w.get() === w.left) w.set(w.was); }
  st.written = [];
}

// Eases the frame toward rest. `quiet`: nothing wants the creature up this frame. Returns the progress (0..1).
export function applyRest(a, st, dt, quiet) {
  st.idle = quiet ? (st.idle || 0) + dt : 0;
  const want = quiet && st.idle >= SETTLE ? 1 : 0;
  // (solved only once it has stood still the whole wait, so the built angles it is solved from are not mid-stride)
  const pose = want || st.p ? restFor(a) : null;
  if (!want && !st.p) return 0;
  if (!pose || !a.joints) { st.p = 0; return 0; }
  st.p = want ? Math.min(1, (st.p || 0) + dt / SETTLING) : Math.max(0, (st.p || 0) - dt / RISE);
  if (!st.p) return 0;
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  const {rest, body} = a.jointRest, k = parts(st.p);
  const ease = (obj, ax, target, w) => {
    const now = obj[ax], next = now + (target - now) * w;
    if (next === now) return;
    obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now});
  };
  for (const [n, o] of Object.entries(a.joints)) {
    const p = pose[n] || {}, w = k[region(n)];
    for (const ax of ['x', 'y', 'z']) ease(o.rotation, ax, rest[n][ax] + (p[ax] || 0), w);
  }
  ease(a.body.position, 'y', body.y + (pose.hipsY || 0), k.body);
  return st.p;
}

// Called every frame for every actor; does nothing for a creature that does not rest this way.
export function updateInsectSettle(a, dt, busy, look = null) {
  if (!a || a.asset || (!groundRests(a) && !beeRests(a))) return 0;
  const st = a.insectRest || (a.insectRest = {p: 0, idle: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  return applyRest(a, st, dt, !busy && !a.actions?.dead && !near);
}
