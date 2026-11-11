// The rats' nervous wash in play (enormous, giant, rabid and sewer rat). A rat standing still that sees the hero come
// near, but not right up to it, sits up on its haunches into the face wash rat-wash.js solves by role and works both
// forepaws in small strokes tight round the nose, the first phase of a brown rat's grooming chain (about 5 s:
// CREATURE-MEASURES.md, Rats). Then the strokes stop dead, paws still up, and the head turns to stare at the hero a
// beat before the rat drops back onto all fours. If the hero steps up beside it, or it moves, acts or dies, it drops
// at once. The wash is baked (tools/bake-rat-wash.mjs writes rat-wash-poses.js: the enormous rat's solve takes 14 s).
// Called from rat-settle.js after the hunch, eased the same way: each value eases from wherever the frame left it
// toward the wash and the next call takes that back, so ending or breaking off returns everything exactly.
import {WASH_POSES} from './rat-wash-poses.js';
import {washes} from './rat-wash.js';
import {NEAR} from './insect-settle.js';

// LEN: seconds the whole wash takes; ADJ: inside this many metres the hero is beside it (one cell, diagonals
// included) and it will not sit up; AGAIN: seconds before a hero who stays near sets off another; DROP: seconds it
// takes to drop when broken off. STROKES: strokes while washing, STROKE: how far each swings the forearm (radians),
// NOD: how far the nose dips into each, STARE: the most the head turns toward the hero.
export const LEN = 5, ADJ = 1.5, AGAIN = 9, DROP = .25, STROKES = 22, STROKE = .22, NOD = .07, STARE = .7;
// the wash's phases as shares of LEN: up by UP, strokes until STILL, the stare until DOWN, back down by 1
export const UP = .12, STILL = .78, DOWN = .9;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The baked wash for this rat (by its name), or null when it has none that met every goal.
export function washFor(a) {
  const b = WASH_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// The wash at progress u (0..1): {up} 0..1 how far sat up, {stroke} -1..1 the forepaws' stroke, {stare} 0..1 the
// head turned on the hero. All zero at both ends; the strokes end on a zero crossing, so they stop dead without a jump.
export function washMotion(u) {
  if (!(u > 0) || !(u < 1)) return {up: 0, stroke: 0, stare: 0};
  const up = smooth(u / UP) * (1 - smooth((u - DOWN) / (1 - DOWN)));
  const s = (u - UP) / (STILL - UP);
  const stroke = s > 0 && s < 1 ? smooth(s / .05) * Math.sin(2 * Math.PI * STROKES * s) : 0;
  // the head snaps round fast and comes back slower, as the body drops
  const stare = smooth((u - STILL) / .025) * (1 - smooth((u - DOWN) / (1 - DOWN)));
  return {up, stroke, stare};
}

// Which way and how far the head turns to face the hero, from the rat's own facing (radians, within ±STARE).
export function stareAt(a, look) {
  const dx = look.x - a.g.position.x, dz = look.z - a.g.position.z;
  let d = Math.atan2(dx, dz) - (a.g.rotation.y || 0);
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.max(-STARE, Math.min(STARE, d));
}

// Called by rat-settle.js every frame, after the hunch and after taking back last frame's wash (`st.written`).
// Returns how far it is sat up (0..1).
export function applyWash(a, st, dt, busy, look) {
  if (!a || a.asset || !washes(a) || !a.joints) return 0;
  const seen = !!look && Number.isFinite(look.x) && Number.isFinite(look.z);
  const d = seen ? Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) : Infinity;
  const still = !busy && !a.actions?.dead, near = d < NEAR, beside = d < ADJ;
  if (st.u == null) {
    st.again = near ? (st.again || 0) - dt : 0;
    if (still && near && !beside && (!st.wasNear || st.again <= 0) && washFor(a)) {
      st.u = 0; st.w = 0; st.broken = false; st.again = AGAIN; st.side = stareAt(a, look);
    }
    st.wasNear = near;
    if (st.u == null) return 0;
  }
  st.wasNear = near;
  if (!still || beside || st.broken) {
    st.broken = true; st.w = Math.max(0, st.w - dt / DROP);
  } else {
    st.u += dt / LEN;
    if (seen) st.side = stareAt(a, look);
  }
  if (st.u >= 1 || (st.broken && st.w <= 0)) { st.u = null; st.w = 0; st.broken = false; return 0; }
  const m = washMotion(st.u);
  if (!st.broken) st.w = m.up;
  const pose = washFor(a), w = st.w, stroke = st.broken ? 0 : m.stroke, stare = st.broken ? 0 : m.stare * (st.side || 0);
  if (!pose) return 0;
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  if (!a.jointRest.pitch) a.jointRest.pitch = {x: a.body.rotation.x};
  const {rest, body, pitch} = a.jointRest;
  const ease = (obj, ax, target) => {
    const now = obj[ax], next = now + (target - now) * w;
    if (next === now) return;
    obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now});
  };
  // the strokes: both forearms swing in at the elbow together and the nose dips into them
  // (`head` and `neck0` are one group on the rats: each joint is eased once, from all its names together)
  const extra = {lleg0_1: {x: STROKE * stroke}, rleg0_1: {x: STROKE * stroke}, neck0: {x: NOD * Math.max(0, stroke), y: stare}};
  const by = new Map();
  for (const [n, o] of Object.entries(a.joints)) { if (!by.has(o)) by.set(o, {n, p: {}, e: {}}); const j = by.get(o); Object.assign(j.p, pose[n]); Object.assign(j.e, extra[n]); }
  for (const [o, {n, p, e}] of by) for (const ax of ['x', 'y', 'z']) ease(o.rotation, ax, rest[n][ax] + (p[ax] || 0) + (e[ax] || 0));
  ease(a.body.rotation, 'x', pitch.x + (pose.body?.x || 0));
  ease(a.body.position, 'y', body.y + (pose.hipsY || 0));
  ease(a.body.position, 'z', body.z + (pose.hipsZ || 0));
  return w;
}
