// The nagas' rear in play (family N, stage 5 step 2). A naga lying up and still that finds the hero come near draws
// its whole neck up into the straight post naga-rear.js solves by role (baked by tools/bake-naga-rear.mjs into
// naga-rear-poses.js), the head hooked forward over him; only once the neck is most of the way up does the hood flare
// open (spreadHood's width, a beat behind, the cobra's way). Reared, the column sways slowly side to side on its root
// while the head is rolled back against the sway, so the face hangs level and fixed on the hero as the neck weaves
// under it. It holds while he stays near and sinks back slowly once he goes; moving, acting or dying drops it within
// DROP. Called from naga-settle.js after the brooding rest, and only on a naga fully up: each value eases from
// wherever the frame left it toward the rear and the next call takes that back (naga-settle.js), so ending or breaking
// off returns every joint, the neck's pivot and the hood exactly.
import {REAR_POSES} from './naga-rear-poses.js';
import {rearsUp, hoodSpread, hoodParts} from './naga-rear.js';
import {NEAR} from './insect-settle.js';

// ALERT: seconds from the hero's arrival to the rear; UP: seconds the neck takes to draw up; DOWN: seconds it takes to
// sink back once he goes; DROP: seconds it takes to drop when broken off; HOOD: the share of the rise before the hood
// starts to open; SWAY: the column's side sway on its root (radians) and PERIOD its seconds, both by eye (a reared
// cobra's weave; no source gave them).
export const ALERT = .5, UP = .8, DOWN = 1.8, DROP = .25, HOOD = .6, SWAY = .1, PERIOD = 2.8;
// The neck pivot's built roll (createNaga leaves it unturned; the rear was solved from there).
export const PIVOT_Z = 0;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The baked rear for this naga (by its name), or null when it has none that met every goal.
export function rearFor(a) {
  const b = REAR_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// How open the hood is when the neck is up a share w (0..1): shut until HOOD of the rise, then flaring to full.
export const hoodOpen = w => smooth((w - HOOD) / (1 - HOOD));

// Called by naga-settle.js every frame, after the rest and after taking back last frame's rear (`st.written`).
// `resting`: how far the brooding rest is in (0 up). Returns how far up the rear is (0..1).
export function applyRear(a, st, dt, busy, look, resting = 0) {
  if (!a || a.asset || !a.joints || !rearsUp(a) || !rearFor(a)) return 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const still = !busy && !a.actions?.dead;
  if (!st.w) {
    st.t = 0;
    if (!near) { st.wait = null; return 0; }
    if (st.wait == null) st.wait = ALERT;
    if (still && !(resting > 0)) st.wait -= dt;
    if (st.wait > 0 || !still || resting > 0) return 0;
  }
  if (!still) { st.w = Math.max(0, st.w - dt / DROP); st.wait = ALERT; }
  else if (near) st.w = Math.min(1, st.w + dt / UP);
  else st.w = Math.max(0, st.w - dt / DOWN);
  if (!st.w) { st.wait = near ? ALERT : null; return 0; }
  st.t += dt;
  const pose = rearFor(a), w = smooth(st.w);
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  const {rest} = a.jointRest;
  const ease = (obj, ax, target, k) => {
    const now = obj[ax], next = now + (target - now) * k;
    if (next === now) return;
    obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now});
  };
  // the weave: the column rolls on its root and the head rolls back as far, so the face holds still over the hero
  const sway = SWAY * Math.sin(st.t * 2 * Math.PI / PERIOD);
  for (const [n, p] of Object.entries(pose)) {
    const o = a.joints[n];
    if (!o || typeof p !== 'object') continue;
    for (const ax of ['x', 'y', 'z']) if (p[ax] || (n === 'head' && ax === 'z')) ease(o.rotation, ax, rest[n][ax] + (p[ax] || 0) - (n === 'head' && ax === 'z' ? sway : 0), w);
  }
  if (a.tail?.rotation) ease(a.tail.rotation, 'z', PIVOT_Z + sway, w);
  const spread = 1 + (hoodSpread(a) - 1) * hoodOpen(st.w);
  for (const o of hoodParts(a)) ease(o.scale, 'x', spread, 1);
  return w;
}
