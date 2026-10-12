// A caveman's idle club-thump (caveman.js, also the neanderthal). A caveman standing still now and
// then hefts the club and slaps it into the free palm, twice, the head dropped to watch the spot,
// and the third time the free hand is a beat late and the head jerks up, as if the bruise surprised
// him. Walking, an action or death takes it back within a moment.
//
// Offsets only: both arms' lift (rotation.x) and the head's pitch (rotation.x) are added on top of
// whatever the gait and action layers wrote, and taken back first next frame, so nothing drifts.
export const HEFT = .7, SLAP = .35, MEET = 1.0, WATCH = .2, START = .18;
export const FIRST_MIN = 3, FIRST_SPAN = 5, GAP_MIN = 8, GAP_SPAN = 9, LEN = 3.4;
const SNAP = 1e-3, FADE_OUT = 14;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

export const thumps = a => !!(a && !a.asset && (a.kind === 'caveman' || a.kind === 'neanderthal') && a.head && a.arms?.length > 1 && a.body);

// The thump at progress u (0..1): {heft} 0..1 the club arm hoisted, {slap} 0..1 the three slaps
// (the third a beat late), {meet} 0..1 the free hand held out, {watch} 0..1 the head dropped,
// {start} 0..1 the head jerked up. All exactly zero at both ends.
export function thumpPose(u) {
  if (!(u > 0) || !(u < 1)) return {heft: 0, slap: 0, meet: 0, watch: 0, start: 0};
  const heft = smooth(u / .12) * (1 - smooth((u - .84) / .1));
  const meet = smooth((u - .05) / .1) * (1 - smooth((u - .82) / .1));
  const bump = (c, w = .015) => Math.exp(-(((u - c) / w) ** 2));
  const slap = Math.min(1, bump(.3) + bump(.42) + bump(.62));
  const watch = smooth((u - .1) / .1) * (1 - smooth((u - .66) / .04));
  const start = smooth((u - .66) / .04) * (1 - smooth((u - .84) / .08));
  return {heft, slap, meet, watch, start};
}

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updateCavemanThump(actor, dt, t, busy) {
  if (!thumps(actor)) return null;
  const st = actor.cavemanThump || (actor.cavemanThump = {seed: ((actor.g?.id ?? 1) * 5003) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {r: 0, l: 0, h: 0}});
  const o = st.o, head = actor.head, club = actor.arms[1], free = actor.arms[0];
  club.rotation.x -= o.r; free.rotation.x -= o.l; head.rotation.x -= o.h;
  st.o = {r: 0, l: 0, h: 0};
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
  const p = thumpPose(st.s), f = st.f;
  // a negative lift swings an arm forward; each slap is a short drop of the club arm
  st.o = {r: -(HEFT * p.heft - SLAP * p.slap * p.heft) * f, l: -MEET * p.meet * f, h: (WATCH * p.watch - START * p.start) * f};
  club.rotation.x += st.o.r; free.rotation.x += st.o.l; head.rotation.x += st.o.h;
  return p;
}
