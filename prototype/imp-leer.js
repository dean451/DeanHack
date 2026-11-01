// An imp's idle leer (imp.js). An imp that stands still now and then jerks its head round to stare,
// tilts it as if sizing something up, jerks it back, and lashes its tail in a tight pleased curl
// on each jerk; the body twists after the head a beat short of it. Walking, an action or death takes it back within a moment.
//
// Offsets only: the head's yaw (rotation.y) and roll (rotation.z) and the tail's swing (rotation.z)
// are added on top of whatever gait.js and the action layer wrote, and taken back first next
// frame, so nothing drifts.
export const DART = .6, TILT = .35, LASH = .6, TWIST = .22;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 4, GAP_SPAN = 8, LEN = 2.2;
// NEAR: how close the hero may come (metres) before the imp stops waiting and leers at once (after ALERT seconds),
// and then again every NEAR_GAP seconds while the hero stays; the idle gaps above are for when nobody is near.
export const NEAR = 4, ALERT = .4, NEAR_GAP = 1.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const leers = a => !!(a && !a.asset && a.quirk === 'imp' && a.head && a.body && a.tail);

// The leer at progress u (0..1): {dart} -1..1 head yaw, {tilt} -1..1 head roll, {lash} -1..1 tail.
// A hard jerk to one side, a held tilt, a jerk back past centre that settles; the tail lashes on
// each jerk. All zero at both ends.
export function leerPose(u) {
  if (!(u > 0) || !(u < 1)) return {dart: 0, tilt: 0, lash: 0};
  const pulse = (c, w) => Math.exp(-(((u - c) / w) ** 2));
  const dart = smooth((u - .1) / .04) * (1 - smooth((u - .5) / .04)) - .6 * smooth((u - .5) / .04) * (1 - smooth((u - .75) / .2));
  const tilt = smooth((u - .2) / .1) * (1 - smooth((u - .55) / .1));
  const lash = Math.sin(u * Math.PI * 16) * (pulse(.12, .07) + pulse(.52, .07)) * .8;
  const c = v => Math.max(-1, Math.min(1, v));
  return {dart: c(dart), tilt: c(tilt), lash: c(lash)};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts; `look` is the hero
// ({x, z}): an imp left standing with the hero within NEAR leers at him soon, instead of when its idle timer says.
export function updateImpLeer(actor, dt, t, busy, look = null) {
  if (!leers(actor)) return null;
  const st = actor.impLeer || (actor.impLeer = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {y: 0, z: 0, t: 0, b: 0}});
  const o = st.o, head = actor.head, tail = actor.tail;
  head.rotation.y -= o.y; head.rotation.z -= o.z; tail.rotation.z -= o.t; actor.body.rotation.y -= o.b;
  st.o = {y: 0, z: 0, t: 0, b: 0};
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
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.wait = (st.alerted ? NEAR_GAP : GAP_MIN + GAP_SPAN * rand(st)); }
  }
  if (st.s == null) return null;
  const p = leerPose(st.s), f = st.f;
  st.o = {y: DART * p.dart * f, z: TILT * p.tilt * f, t: LASH * p.lash * f, b: TWIST * p.dart * f};
  actor.body.rotation.y += st.o.b;
  head.rotation.y += st.o.y; head.rotation.z += st.o.z; tail.rotation.z += st.o.t;
  return p;
}
