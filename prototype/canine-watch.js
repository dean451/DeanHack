// A jackal's idle watch (canine.js). A wild canine that stands still now and then fixes on
// something in the dark: the head drops low and stays there, creeps to one side as if stalking,
// snaps back up with a twitch, and the tail gives one stiff swing. Walking, an action or death
// takes it back within a moment. Pets (quirk 'dog') are left alone.
//
// Offsets only: the head's pitch (rotation.x) and yaw (rotation.y) and the tail's swing (rotation.z)
// are added on top of whatever gait.js and the action layer wrote, and taken back first next frame,
// so nothing drifts.
export const LOWER = .35, CREEP = .4, STIFF = .4;
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 5, GAP_SPAN = 8, LEN = 3.2;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const watches = a => !!(a && !a.asset && a.quirk === 'canine' && a.head && a.body);

// The watch at progress u (0..1): {lower} 0..1 head pitch, {creep} -1..1 head yaw, {stiff} -1..1 tail.
// The head sinks, creeps aside and holds, then twitches up; the tail swings once at the start. All zero at both ends.
export function watchPose(u) {
  if (!(u > 0) || !(u < 1)) return {lower: 0, creep: 0, stiff: 0};
  const lower = smooth(u / .25) * (1 - smooth((u - .78) / .06));
  const creep = smooth((u - .25) / .3) * (1 - smooth((u - .7) / .08));
  const stiff = Math.exp(-(((u - .12) / .06) ** 2)) * Math.sin((u - .12) * 50);
  return {lower, creep, stiff: Math.max(-1, Math.min(1, stiff))};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateCanineWatch(actor, dt, t, busy) {
  if (!watches(actor)) return null;
  const st = actor.canineWatch || (actor.canineWatch = {seed: ((actor.g?.id ?? 1) * 5501) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {x: 0, y: 0, z: 0}});
  const o = st.o, head = actor.head, tail = actor.tail;
  head.rotation.x -= o.x; head.rotation.y -= o.y;
  if (tail) tail.rotation.z -= o.z;
  st.o = {x: 0, y: 0, z: 0};
  if (!st.wait && st.s == null) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.s != null) {
    if (still && !st.broken) { st.s += dt / LEN; if (st.s >= 1) { st.s = null; st.f = 0; } }
    else { st.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) { st.s = null; st.f = 0; st.broken = false; } }
    if (st.s != null && !st.broken) st.f = Math.min(1, st.f + dt * 14);
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.s = 0; st.f = 0; st.broken = false; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (st.s == null) return null;
  const p = watchPose(st.s), f = st.f;
  st.o = {x: LOWER * p.lower * f, y: CREEP * p.creep * f, z: STIFF * p.stiff * f};
  head.rotation.x += st.o.x; head.rotation.y += st.o.y;
  if (tail) tail.rotation.z += st.o.z;
  return p;
}
