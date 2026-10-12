// A pet cat's idle tic (feline.js, quirk 'feline', flagged `petCat` by live.js). A standing pet now
// and then sinks its head and kneads the air: the forelegs tread in turn, four slow beats, as if
// working something soft that is not there. The last paw stays lifted a beat too long, claws out,
// while the tail goes rigid, then drops. Walking, an action or death takes it back within a moment.
// Wild cats have their own stare (feline-watch.js).
//
// Offsets only: the head's pitch (rotation.x), the forelegs' swing (rotation.x) and the tail's
// swing (rotation.z) are added on top of what gait.js and the action layer wrote, and taken back
// first next frame, so nothing drifts.
export const SINK = .28, TREAD = .5, STIFF = .35;
export const FIRST_MIN = 4, FIRST_SPAN = 5, GAP_MIN = 9, GAP_SPAN = 9, LEN = 3.4;
const SNAP = 1e-3, FADE_OUT = 14, FORE = [1, 3];

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const kneads = a => !!(a && !a.asset && a.quirk === 'feline' && a.petCat && a.head && a.tail && a.legs?.length >= 4);

// The tic at progress u (0..1): {sink} 0..1 head, {l, r} -1..1 forelegs (up is positive), {stiff}
// 0..1 tail. Four treads alternate between the paws from .14 to .66; the right paw is then held
// up from .7 to .86 and drops. All zero at both ends.
export function kneadPose(u) {
  if (!(u > 0) || !(u < 1)) return {sink: 0, l: 0, r: 0, stiff: 0};
  const sink = smooth(u / .12) * (1 - smooth((u - .9) / .08));
  const beat = (a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };
  const l = beat(.14, .27) + beat(.4, .53);
  const held = smooth((u - .66) / .04) * (1 - smooth((u - .86) / .02));
  const r = beat(.27, .4) + beat(.53, .66) + held;
  const stiff = smooth((u - .64) / .05) * (1 - smooth((u - .87) / .03));
  return {sink, l: Math.min(1, l), r: Math.min(1, r), stiff};
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after the gait layer. `busy` is true while the actor walks or acts.
export function updatePetCatTic(actor, dt, t, busy) {
  if (!kneads(actor)) return null;
  const st = actor.petCatTic || (actor.petCatTic = {seed: ((actor.g?.id ?? 1) * 6007) % 2147483647 || 1, wait: 0, s: null, f: 0, o: {h: 0, l: 0, r: 0, t: 0}});
  const o = st.o, head = actor.head, tail = actor.tail, [ll, rl] = FORE.map(i => actor.legs[i]);
  head.rotation.x -= o.h; ll.rotation.x -= o.l; rl.rotation.x -= o.r; tail.rotation.z -= o.t;
  st.o = {h: 0, l: 0, r: 0, t: 0};
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
  const p = kneadPose(st.s), f = st.f;
  st.o = {h: SINK * p.sink * f, l: -TREAD * p.l * f, r: -TREAD * p.r * f, t: STIFF * p.stiff * f};
  head.rotation.x += st.o.h; ll.rotation.x += st.o.l; rl.rotation.x += st.o.r; tail.rotation.z += st.o.t;
  return p;
}
