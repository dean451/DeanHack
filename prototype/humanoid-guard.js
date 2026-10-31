// A dwarf caught standing with the hero close by drops into its wide-stance brace (humanoid-brace.js, solved by
// role) and holds it, shifting its weight now and then; when the hero backs off, or the dwarf walks or acts, it
// straightens slowly. Called from live.js's actor loop after the other idle motion. Like the settling in
// insect-settle.js it eases each joint toward the pose and takes the write back at the start of the next call, so
// every joint returns exactly to its awake value.
import {bracePose, braces} from './humanoid-brace.js';
import {takeBackRest} from './insect-settle.js';

// GUARD: how close the hero may come (metres) before it sets its feet; DROP and RISE: seconds to go down (quick)
// and to straighten (slow); SHIFT: the weight shift's size (radians of the pelvis's drop joint) and rate (rad/s).
export const GUARD = 3, DROP = .45, RISE = 1.3, SHIFT = .03, RATE = 1.7;

const POSES = new Map();
// The solved brace for this kind of dwarf (cached by name and scale), or null when it missed a goal.
export function braceFor(a) {
  const key = `${a.species || a.name || ''}:${a.g.scale.x}`;
  if (!POSES.has(key)) {
    const r = bracePose(a), worst = Math.max(...r.residuals.map(v => Math.hypot(...(Array.isArray(v) ? v : [v]))));
    POSES.set(key, worst < .02 ? r.pose : null);
  }
  return POSES.get(key);
}

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };

// Called every frame for every actor; does nothing for a creature that is not a dwarf. Returns the progress (0..1).
export function updateDwarfGuard(a, dt, t, busy, look = null) {
  if (!braces(a) || a.asset) return 0;
  const st = a.dwarfGuard || (a.dwarfGuard = {p: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < GUARD;
  const want = near && !busy && !a.actions?.dead;
  const pose = want || st.p ? braceFor(a) : null;
  if (!pose) { st.p = 0; return 0; }
  st.p = want ? Math.min(1, st.p + dt / DROP) : Math.max(0, st.p - dt / RISE);
  if (!st.p) return 0;
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  const {rest, body} = a.jointRest, w = smooth(st.p);
  const ease = (obj, ax, target) => {
    const now = obj[ax], next = now + (target - now) * w;
    if (next === now) return;
    obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now});
  };
  for (const [n, o] of Object.entries(a.joints)) {
    const p = pose[n] || {};
    for (const ax of ['x', 'y', 'z']) ease(o.rotation, ax, rest[n][ax] + (p[ax] || 0));
  }
  // held, the weight shifts from foot to foot: the chest rolls a little about the waist
  const sway = st.p === 1 && a.joints.spine0 ? Math.sin(t * RATE) * SHIFT : 0;
  if (sway) { const o = a.joints.spine0.rotation, now = o.z; o.z = now + sway; st.written.push({get: () => o.z, set: v => { o.z = v; }, left: o.z, was: now}); }
  ease(a.body.position, 'y', body.y + (pose.hipsY || 0));
  return st.p;
}
