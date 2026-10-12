// A piercer's idle lurch (piercer.js, any kind). It is a thing that lives on ceilings and falls on
// whatever walks under it, and a standing one cannot quite stop rehearsing: it sags slowly back as
// if hauling itself up on a hidden hold, hangs there trembling with the point drawn up, then drops
// the body in one hard jolt and rocks to a stop, as if it had missed. Walking, an action or death
// takes it back within a moment.
//
// Offsets only: the body's pitch (rotation.x), roll (rotation.z) and height (position.y) are
// added on top of whatever the gait and action layers wrote, and taken back first next frame, so
// nothing drifts.
export const REAR = .5, ROCK = .16, DROP = .05, SHAKE = .06;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 8, GAP_SPAN = 9, LEN = 3.2;
const SNAP = 1e-3, FADE_OUT = 14, TREMBLE_HZ = 31;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const lurches = a => !!(a && !a.asset && a.kind && a.body && !a.legs?.length && /piercer/i.test(a.kind));

// The lurch at progress u (0..1): {rear} 0..1 pitch back, {shake} 0..1 trembling while it hangs,
// {drop} 0..1 body height lost in the jolt, {rock} -1..1 roll as it settles. All exactly zero at
// both ends.
export function lurchPose(u) {
  if (!(u > 0) || !(u < 1)) return {rear: 0, shake: 0, drop: 0, rock: 0};
  const rear = smooth(u / .45) * (1 - smooth((u - .6) / .03));
  const shake = smooth((u - .3) / .1) * (1 - smooth((u - .58) / .02));
  const drop = Math.exp(-(((u - .64) / .035) ** 2));
  const rock = Math.sin((u - .62) * 34) * Math.exp(-(u - .62) * 7) * smooth((u - .62) / .01) * (1 - smooth((u - .9) / .09));
  return {rear, shake, drop, rock: Math.max(-1, Math.min(1, rock))};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updatePiercerLurch(actor, dt, t, busy) {
  if (!lurches(actor)) return null;
  const st = actor.piercerLurch || (actor.piercerLurch = {seed: ((actor.g?.id ?? 1) * 5381) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {x: 0, y: 0, z: 0}});
  const o = st.o, body = actor.body;
  body.rotation.x -= o.x; body.rotation.z -= o.z; body.position.y -= o.y;
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
  const p = lurchPose(st.s), f = st.f;
  st.o = {
    x: -REAR * p.rear * f,
    y: -DROP * p.drop * f,
    z: (ROCK * p.rock + SHAKE * p.shake * Math.sin(t * TREMBLE_HZ)) * f,
  };
  body.rotation.x += st.o.x; body.rotation.z += st.o.z; body.position.y += st.o.y;
  return p;
}
