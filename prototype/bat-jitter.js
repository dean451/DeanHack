// The bats' jitter (creature animation queue item 7). Bats, giant bats and vampire bats (bat() in
// creatures.js) never fly straight: in the game they flutter about at random, so here they never
// hang still either.
//  - The body flits: it holds a spot, then darts to a new one nearby, banking into each dart and
//    pitching after it, the head snapping round. A bat jinks quick and small, a giant bat lurches
//    wide and heavy, a vampire bat drifts slow and sure.
//  - The wings beat on their own clock (live.js's flap is overwritten): a giant bat beats slower
//    and deeper than a bat, which sells its size. Each dart whips the beat faster.
//  - Away from the hero, now and then it swoops: wings locked in a V, it drops, then claws back up
//    with a burst of hard beats.
//  - Within RANGE tiles it turns to face the hero; the flitting tightens (a vampire bat's almost
//    stops, and it hangs, staring) and now and then it feints: darts at the hero and jerks back.
//  - It bites with a forward pitch and a flurry of beats; a blow tumbles it (a rolling wobble and a
//    drop) and the wings flail.
//  - On death everything eases back to rest and live.js's flap takes the wings again.
//
// The module owns the lift group's position and rotation (written absolutely from rest every
// frame) and blends the wings' rotation.z with whatever live.js wrote this frame. No extra draws.

const TAU = Math.PI * 2;
// Hero sensing: range (tiles), the most the head turns toward the hero (rad) and how fast.
export const RANGE = 5, FACE_YAW = .9, FACE_RATE = 5;
// Swoops (only while the hero is out of range): first after FIRST_MIN..+FIRST_SPAN s, then
// GAP_MIN..+GAP_SPAN apart, SWOOP_LEN s long. Feints (hero in range): FEINT_MIN..+FEINT_SPAN apart.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 5, SWOOP_LEN = 1.3;
export const FEINT_MIN = 2.5, FEINT_SPAN = 3.5, FEINT_LEN = .7;
// A blow: the tumble's size and how fast it fades (1/s).
export const TUMBLE = .7, TUMBLE_DECAY = 3.5;
// Banking and pitching into a dart: rad per unit of offset speed, and the caps.
export const BANK = 1.6, BANK_MAX = .55, PITCH = 1.2, PITCH_MAX = .4;
// The lift never drops below MIN_LIFT (the rest height is .62), so the bat stays off the floor.
export const MIN_LIFT = .3;
export const REST_RATE = 3;
const SNAP = 1e-3;
// Per kind: flit reach (x, y, z), the dart rate (1/s), the hold between darts (s); wing beat
// (rad/s, amplitude) and how much a dart quickens it; the swoop's drop; the feint's reach; how
// calm it gets when it has seen the hero (0 = no change, 1 = still).
export const LOOKS = {
  bat: {reach: {x: .12, y: .06, z: .1}, jerk: 14, gap: .18, gapSpan: .5, beat: 14, amp: .65, whip: .6, drop: .16, feint: .16, calm: .4, yaw: .45},
  'giant bat': {reach: {x: .2, y: .09, z: .16}, jerk: 8, gap: .3, gapSpan: .7, beat: 9, amp: .8, whip: .5, drop: .22, feint: .18, calm: .3, yaw: .35},
  'vampire bat': {reach: {x: .07, y: .04, z: .06}, jerk: 5, gap: .6, gapSpan: 1, beat: 10, amp: .72, whip: .4, drop: .12, feint: .26, calm: .85, yaw: .2},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const jitters = a => !!(a && !a.asset && a.batJitter && a.batLift && Array.isArray(a.wings) && a.wings.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The swoop at progress u (0..1): {drop, glide, climb} (0..1). It locks its wings and drops (to
// .45), then beats hard back up (from .45); the lift overshoots a little and settles.
export function swoopPose(u) {
  if (!(u > 0) || !(u < 1)) return {drop: 0, glide: 0, climb: 0};
  const drop = smooth(u / .4) * (1 - smooth((u - .45) / .45)) - .25 * Math.sin(clamp01((u - .6) / .4) * Math.PI);
  return {drop, glide: smooth(u / .12) * (1 - smooth((u - .4) / .1)), climb: clamp01(Math.sin(clamp01((u - .42) / .5) * Math.PI))};
}

// The feint at progress u (0..1): how far toward the hero (-FEINT_WINDUP..1). It rocks back a hair
// first, like a cat about to pounce, then a fast dart in and a snap back.
export const FEINT_WINDUP = .2;
export function feintPose(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth((u - .1) / .2) * (1 - smooth((u - .4) / .5)) - FEINT_WINDUP * Math.sin(Math.PI * clamp01(u / .1));
}

// The bite at action phase u (0..1): forward pitch (0..1).
export function bitePose(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return Math.sin(Math.PI * u) ** 2;
}

const rot = o => ({x: o.rotation.x, y: o.rotation.y, z: o.rotation.z});
function setup(a) {
  const L = a.batLift;
  const st = {seed: ((a.g?.id ?? 1) * 48271) % 2147483647 || 1, life: 1, look: LOOKS[a.batJitter] || LOOKS.bat,
    pos: L.position.clone(), rot: rot(L), at: {x: 0, y: 0, z: 0}, to: {x: 0, y: 0, z: 0}, vel: {x: 0, y: 0, z: 0},
    yaw: 0, yawTo: 0, face: 0, near: 0, wait: 0, hold: 0, swoop: null, feint: null, feintWait: 0,
    tumble: 0, act: 1, lastHit: null, phase: 0, T: 0};
  st.hold = st.look.gap * rand(st);
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.feintWait = FEINT_MIN * .5 + FEINT_SPAN * rand(st);
  st.phase = rand(st) * TAU;
  st.ph = rand(st) * TAU;
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's {b: bearing relative to facing, d: distance}, or null when out of range.
function sense(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return {b: wrap(Math.atan2(dx, dz) - g.rotation.y), d};
}

// Call once a frame (fidget.js does), after live.js has flapped the wings. `busy` holds off a
// swoop or feint while it moves or acts; `look` is the hero's position (same parent as actor.g).
export function updateBatJitter(a, dt, t, busy, look = null) {
  if (!jitters(a)) return null;
  const st = a.batJitter_ || (a.batJitter_ = setup(a));
  const L = st.look, dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // the hero: face them and settle, the nearer the more
  const h = dead ? null : sense(a, look);
  st.near = approach(st.near, h ? 1 - h.d / RANGE * .6 : 0, 4, dt);
  st.face = approach(st.face, h ? clamp(h.b, FACE_YAW) : 0, FACE_RATE, dt);
  const ex = st.near;

  // a blow: tumble, then right itself
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.tumble = 1; }
  st.tumble *= Math.exp(-TUMBLE_DECAY * dt);
  if (st.tumble < SNAP) st.tumble = 0;
  const tb = st.tumble;

  // the bite
  const atk = dead ? null : current(a, 'attack');
  const bite = atk ? bitePose(a.actions.u ?? 0) : 0;

  // swoops while the hero is away, feints while they're near; each on its own clock
  if (st.swoop != null) { st.swoop += dt / SWOOP_LEN; if (st.swoop >= 1) st.swoop = null; }
  else if (!dead && !h) { st.wait -= dt; if (st.wait <= 0 && !busy) { st.swoop = 0; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  if (st.feint != null) { st.feint += dt / FEINT_LEN; if (st.feint >= 1) st.feint = null; }
  else if (!dead && h && st.swoop == null) { st.feintWait -= dt; if (st.feintWait <= 0 && !busy) { st.feint = 0; st.feintWait = FEINT_MIN + FEINT_SPAN * rand(st); } }
  // a bite or a blow eases a swoop or feint out (never a jump)
  st.act = approach(st.act, atk || tb > .2 ? 0 : 1, 12, dt);
  const s0 = swoopPose(st.swoop ?? 0), k = st.act;
  const sw = {drop: s0.drop * k, glide: s0.glide * k, climb: s0.climb * k}, fe = feintPose(st.feint ?? 0) * k;

  // flitting: hold a spot, then dart to a new one (tighter once it has seen the hero)
  st.hold -= dt;
  if (st.hold <= 0 && !dead) {
    const r = L.reach;
    st.to = {x: (rand(st) * 2 - 1) * r.x, y: (rand(st) * 2 - 1) * r.y, z: (rand(st) * 2 - 1) * r.z};
    st.yawTo = (rand(st) * 2 - 1) * L.yaw;
    st.hold = L.gap + L.gapSpan * rand(st) * (1 + L.calm * ex);
  }
  const calm = (1 - L.calm * ex) * (1 - Math.max(sw.glide, bite));
  const prev = {...st.at};
  for (const k of ['x', 'y', 'z']) st.at[k] = approach(st.at[k], st.to[k] * calm, L.jerk, dt);
  for (const k of ['x', 'y', 'z']) st.vel[k] = dt > 0 ? approach(st.vel[k], (st.at[k] - prev[k]) / dt, 20, dt) : st.vel[k];
  st.yaw = approach(st.yaw, st.yawTo * calm, L.jerk * .8, dt);
  const speed = Math.hypot(st.vel.x, st.vel.y, st.vel.z);

  // the lift: flit offset, swoop drop, feint toward the hero, tumble drop; bank and pitch into it
  const lift = a.batLift, p = st.pos, r = st.rot, ph = st.ph;
  const fx = Math.sin(st.face) * L.feint * fe, fz = Math.cos(st.face) * L.feint * fe;
  const y = Math.max(MIN_LIFT, p.y + (st.at.y - L.drop * sw.drop - .12 * tb) * w);
  lift.position.set(p.x + (st.at.x + fx) * w, y, p.z + (st.at.z + fz) * w);
  const roll = clamp(-st.vel.x * BANK, BANK_MAX) + TUMBLE * tb * Math.sin(st.T * 19 + ph);
  const pitch = clamp(st.vel.z * PITCH, PITCH_MAX) + .3 * fe + .4 * bite + .25 * sw.drop - .2 * sw.climb + .35 * tb * Math.sin(st.T * 13);
  lift.rotation.x = r.x + pitch * w;
  lift.rotation.y = r.y + (st.yaw + st.face * ex + .03 * Math.sin(st.T * 1.3 + ph)) * w;
  lift.rotation.z = r.z + roll * w;

  // the wings: their own beat, whipped faster by darts, climbs, bites and blows, locked in a V to glide
  st.phase += L.beat * (1 + Math.min(L.whip * speed * 4, 1) + .6 * sw.climb + bite + tb) * dt;
  if (st.phase > 1e4) st.phase -= Math.floor(st.phase / TAU) * TAU;
  const beat = Math.sin(st.phase) * L.amp * (1 + .15 * sw.climb + .2 * tb), flap = beat * (1 - sw.glide) + .22 * sw.glide;
  if (w > 0) a.wings.forEach((wing, i) => {
    const side = wing.userData.side || (i ? 1 : -1);
    wing.rotation.z = wing.rotation.z * (1 - w) + side * flap * w;
  });
  return st;
}
