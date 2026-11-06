// A kobold's idle cringe (kobold.js). A kobold that stands still now and then goes jumpy, as if
// it had heard the boot of something bigger: the head darts to one side, snaps to the other, ducks
// low, and the tail flicks nervously with each start, and the whole back hunches down with the duck. Walking, an action or death takes it back
// within a moment.
//
// Offsets only: the head's pitch (rotation.x) and yaw (rotation.y) and the tail's swing (rotation.z)
// are added on top of whatever gait.js and the action layer wrote, and taken back first next frame,
// so nothing drifts.
import {takeBackRest} from './insect-settle.js';

export const DART = .55, DUCK = .3, FLICK = .5, HUNCH = .14;
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 4, GAP_SPAN = 8, LEN = 2.4;
// NEAR: how close the hero may come (metres) before a kobold stops waiting and cringes at once (after ALERT
// seconds), then again every NEAR_GAP seconds while he stays; the idle gaps above are for when nobody is near.
export const NEAR = 4, ALERT = .4, NEAR_GAP = 1.4;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const cringes = a => !!(a && !a.asset && a.quirk === 'kobold' && a.head && a.body);

// The cringe at progress u (0..1): {dart} -1..1 head yaw, {duck} 0..1 head pitch down, {flick} -1..1 tail.
// Two quick darts (left, right) then a duck that eases back; the tail flicks on each dart. All zero at both ends.
export function cringePose(u) {
  if (!(u > 0) || !(u < 1)) return {dart: 0, duck: 0, flick: 0};
  const pulse = (c, w) => Math.exp(-(((u - c) / w) ** 2));
  const dart = pulse(.2, .05) - pulse(.38, .05);
  const duck = smooth((u - .5) / .1) * (1 - smooth((u - .82) / .15));
  const flick = Math.sin(u * Math.PI * 14) * (pulse(.2, .08) + pulse(.38, .08)) * .8;
  return {dart: Math.max(-1, Math.min(1, dart)), duck, flick: Math.max(-1, Math.min(1, flick))};
}

// Which way the first dart goes: toward the hero's side of the kobold's own facing (+1 turns the head toward
// +x at yaw 0). Dead ahead, directly behind, or nobody near keeps +1.
export function sideToward(actor, look) {
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return 1;
  const dx = look.x - actor.g.position.x, dz = look.z - actor.g.position.z;
  if (Math.hypot(dx, dz) < 1e-6) return 1;
  let d = Math.atan2(dx, dz) - (actor.g.rotation.y || 0);
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d) < .1 || Math.abs(d) > Math.PI - .1 ? 1 : (d > 0 ? 1 : -1);
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts;
// `look` is the hero ({x, z}): a kobold left standing with him within NEAR cringes at him soon, first toward his side.
export function updateKoboldCringe(actor, dt, t, busy, look = null) {
  if (!cringes(actor)) return null;
  const st = actor.koboldCringe || (actor.koboldCringe = {seed: ((actor.g?.id ?? 1) * 4421) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {x: 0, y: 0, z: 0, b: 0}, side: 1});
  // The crouch (kobold-settle.js) runs last in the frame and eases these same joints; take it back first so the offsets
  // below are removed from the values they were added to, else the crouch's take-back finds them changed and leaves them.
  if (actor.koboldRest) takeBackRest(actor.koboldRest);
  const o = st.o, head = actor.head, tail = actor.tail;
  actor.body.rotation.x -= o.b;
  head.rotation.x -= o.x; head.rotation.y -= o.y;
  if (tail) tail.rotation.z -= o.z;
  st.o = {x: 0, y: 0, z: 0, b: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - actor.g.position.x, look.z - actor.g.position.z) < NEAR;
    if (near && st.wait > ALERT && !st.alerted) { st.wait = ALERT; st.alerted = true; }
    if (!near) st.alerted = false;
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.side = near ? sideToward(actor, look) : 1; st.wait = st.alerted ? NEAR_GAP : GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = cringePose(st.s), f = st.f;
  st.o = {x: DUCK * p.duck * f, y: DART * p.dart * f * (st.side || 1), z: FLICK * p.flick * f, b: HUNCH * p.duck * f};
  actor.body.rotation.x += st.o.b;
  head.rotation.x += st.o.x; head.rotation.y += st.o.y;
  if (tail) tail.rotation.z += st.o.z;
  return p;
}
