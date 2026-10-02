// One-eyed Sam (one-eyed-sam.js): she flies (M1_FLY), so she never quite touches the floor.
//  - She hangs HOVER above it, rising and sinking slowly with an uneven bob and a slight list. Her
//    legs dangle limp, toes down, trailing a little and swaying out of step.
//  - Moving from tile to tile she glides instead of striding: the walk's leg swing is mostly
//    taken back, the legs trail behind her, and she leans into it and rides a little higher.
//  - With the hero within RANGE tiles she rises a touch and looms, leaning toward them.
//  - Her attacks swoop: she rises through the wind-up, then drops and pitches forward into the
//    cut (the sword swing itself is the action layer's), and recovers.
//  - A blow knocks her back in the air: she pitches back and bobs up, wobbling, then settles.
//  - Death: she drops out of the air and everything eases to rest. Turned to stone (`a.stone`):
//    she holds where she is.
// Handles used: body, legs. No extra draws. Her eye is eye-flare.js's.

const TAU = Math.PI * 2;
// The hover: height, bob (units) and rate (Hz); the list (rad).
export const HOVER = .07, BOB = .018, BOB_HZ = .38, LIST = .025;
// The legs: trail at rest and gliding (rad, + swings the feet back), their out-of-step sway (rad),
// and how much of the walk's stride the glide takes back (0..1).
export const TRAIL = .1, GLIDE_TRAIL = .32, DANGLE = .05, STRIDE_DAMP = .85;
// The glide: lean (rad) and lift (units).
export const GLIDE_LEAN = .14, GLIDE_LIFT = .03;
// Hero sensing (tiles); the loom's rise (units) and lean (rad).
export const RANGE = 6, LOOM_RISE = .035, LOOM_LEAN = .05;
// The swoop: rise in the wind-up, drop at the cut (units), pitch into the cut (rad).
export const SWOOP_RISE = .06, SWOOP_DROP = .05, SWOOP_PITCH = .16;
// The blow: knocked up (units) and back (rad).
export const JOLT = .05, JOLT_PITCH = .12;
export const REST_RATE = 4;
const SNAP = 1e-3;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

export const isSam = a => !!(a && !a.asset && a.kind === 'one-eyed sam' && a.g && a.body && a.legs?.length >= 2);

// The swoop over action progress u: {rise, drop} weights, both 0 at u = 0 and 1. She rises to .4,
// drops fast to .55, then recovers.
export function swoopCurve(u) {
  if (!(u > 0) || !(u < 1)) return {rise: 0, drop: 0};
  const up = smooth(u / .4), down = smooth((u - .4) / .15), back = 1 - smooth((u - .6) / .4);
  return {rise: up * (1 - down), drop: down * back};
}

function setup(a) {
  const seed = ((a.g.id ?? 1) * 48271) % 2147483647 || 1;
  return {phase: (seed % 1000) / 1000 * TAU, life: 1, T: 0, off: new Map(), glide: 0, loom: 0, jolt: 0, joltAge: 0, lastHit: null};
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since (live.js
// and gait.js set the body's height and the legs' swing outright each frame). The match has a
// tolerance: actions.js adds its pose after us and takes it back before us, and that round trip
// isn't always exact in floating point.
function offset(st, obj, prop, axis, v) {
  const key = obj.uuid + prop + axis, o = st.off.get(key);
  if (o && Math.abs(obj[prop][axis] - o.out) < 1e-9) obj[prop][axis] -= o.v;
  obj[prop][axis] += v;
  st.off.set(key, {v, out: obj[prop][axis]});
}
// What obj[prop][axis] holds without our last offset (the value someone else wrote this frame).
function under(st, obj, prop, axis) {
  const o = st.off.get(obj.uuid + prop + axis), v = obj[prop][axis];
  return o && Math.abs(v - o.out) < 1e-9 ? v - o.v : v;
}

function heroDist(a, look) {
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return Infinity;
  return Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z);
}

// Call once a frame (fidget.js does, after gait.js). `busy` is true while she moves or acts; `look`
// is the hero's position (same parent as actor.g). Returns the state, or null for anything else.
export function updateSamHover(a, dt, t, busy, look = null) {
  if (!isSam(a)) return null;
  const st = a.samHover || (a.samHover = setup(a));
  dt = a.stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const live = !dead && !a.stone;
  const walking = busy && !cur && !q?.queue?.length;

  st.glide = approach(st.glide, walking && live ? 1 : 0, 5, dt);
  st.loom = approach(st.loom, live && heroDist(a, look) <= RANGE ? 1 : 0, 1.5, dt);

  // A blow knocks her back and up.
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) { st.lastHit = cur; st.jolt = 1; st.joltAge = 0; }
  st.jolt = st.jolt > SNAP ? st.jolt * Math.exp(-3.5 * dt) : 0;
  st.joltAge += dt;
  // eased in over a few frames, so the knock doesn't snap; then a wobble as it dies away
  const jolt = st.jolt * (1 - Math.exp(-20 * st.joltAge)) * (.75 + .25 * Math.cos(st.joltAge * 4.5 * TAU));

  // The swoop, for any attack once its wait is over.
  const atk = !dead && cur?.kind === 'attack' && (q.age ?? 0) >= (cur.wait ?? 0);
  const s = atk ? swoopCurve(q.u ?? 0) : {rise: 0, drop: 0};

  const w = st.life, T = st.T + st.phase;
  const bob = BOB * (Math.sin(T * BOB_HZ * TAU) * .7 + Math.sin(T * BOB_HZ * 2.3 * TAU + 1) * .3);
  offset(st, a.body, 'position', 'y', (HOVER + bob + GLIDE_LIFT * st.glide + LOOM_RISE * st.loom + SWOOP_RISE * s.rise - SWOOP_DROP * s.drop + JOLT * jolt) * w);
  offset(st, a.body, 'rotation', 'x', (GLIDE_LEAN * st.glide + LOOM_LEAN * st.loom + SWOOP_PITCH * s.drop - JOLT_PITCH * jolt) * w);
  offset(st, a.body, 'rotation', 'z', LIST * Math.sin(T * BOB_HZ * .6 * TAU) * w);

  // The legs: most of the walk's stride taken back, then the dangle and trail. The trail grows with
  // the glide and with the swoop's rise (the feet swing back as she lifts).
  for (let i = 0; i < 2; i++) {
    const leg = a.legs[i], stride = under(st, leg, 'rotation', 'x');
    const sway = DANGLE * Math.sin(T * (.55 + .13 * i) * TAU + i * 2.1);
    offset(st, leg, 'rotation', 'x', (-STRIDE_DAMP * st.glide * stride + TRAIL + (GLIDE_TRAIL - TRAIL) * Math.max(st.glide, s.rise) + sway) * w);
  }
  return st;
}
