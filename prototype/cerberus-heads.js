// Cerberus's three heads (canine.js), each with a mind of its own.
//  - Alone: every head keeps its own watch. Each picks a new spot to look at on its own clock
//    (the side heads mostly out over their own flank, the middle one ahead), flicks to it fast
//    and holds, nose down to scent the floor or raised to test the air, with now and then a quick
//    run of sniffing nods. Every so often a side head turns on the middle one and snaps at it, and
//    the middle head rears back from it with a snarl.
//  - The hero within RANGE tiles: all three lock on, heads lowered, each with its own growling
//    tremor, and one of them (chosen at random) lunges a feint snap at the hero now and then.
//  - Walking: the heads ease forward and bob out of step with each other.
//  - An attack: the three bite in turn (middle, left, right): each rears up, then snaps down at
//    the hero. actions.js still pitches the middle head (the `head` handle), so its own snap is smaller.
//  - A blow: each head jerks a different way and settles, one after another.
//  - Death: every head eases back to rest. Turned to stone (`a.stone`): they hold.
// Only the three neck pivots (`heads`) move, as offsets taken back each frame. No extra draws.

const TAU = Math.PI * 2;
// Hero sensing (tiles); the most a head turns from its rest (rad) and how quickly it gets there (1/s).
export const RANGE = 6, YAW = 1.2, RATE = 7, LOCK_RATE = 11;
// The watch: per head the yaw range (rad, before mirroring for the right head), the pitch range
// (positive looks down), and seconds between looks.
export const SCAN = {side: [-.15, .55], middle: [-.35, .35]}, PITCH = [-.18, .3], LOOK_MIN = .7, LOOK_SPAN = 1.9;
// Sniffing: chance a look comes with a run of nods, their size (rad), rate (Hz) and length (s).
export const SNIFF = .35, SNIFF_AMP = .05, SNIFF_HZ = 7, SNIFF_LEN = .6;
// Squabbles: seconds between them, how long one lasts, the side head's turn in and jab, the middle's flinch.
export const SQUAB_MIN = 6, SQUAB_SPAN = 7, SQUAB_LEN = 1, SQUAB_TURN = .5, SQUAB_JAB = .22, FLINCH = .22;
// Near the hero: the heads lower (rad), growl (rad, Hz) and feint (s between, rad, s long).
export const LOWER = .14, GROWL = .012, GROWL_HZ = 13, FEINT_MIN = 1.6, FEINT_SPAN = 2.8, FEINT = .3, FEINT_LEN = .4;
// Walking: the nod (rad) at the stride rate (Hz).
export const WALK_NOD = .05, WALK_HZ = 3.5;
// The bite in turn: each head's start (fraction of the action, which is about .4 s), its share of it, rear and snap (rad).
export const BITE_AT = [.2, 0, .4], BITE_LEN = .55, REAR = .26, SNAP_DOWN = .38, MIDDLE_SNAP = .45;
// A blow: the jerk (rad), each head's delay (s) and the decay (1/s).
export const JERK = .3, JERK_LAG = .07, JERK_DECAY = 6;
export const REST_RATE = 3;
const EPS = 1e-3;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const isCerberus = a => !!(a && !a.asset && a.quirk === 'canine' && a.g && a.heads?.length === 3 && a.heads[1] === a.head);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The bite for head i over the action's progress u: {pitch, k} (k is how far into the bite).
export function bitePose(i, u) {
  const v = (u - BITE_AT[i]) / BITE_LEN;
  if (!(v > 0) || !(v < 1)) return {pitch: 0, k: 0};
  // rear up, hold a beat, snap down hard, ease back
  const rear = smooth(v / .35) * (1 - smooth((v - .35) / .15));
  const snap = smooth((v - .38) / .12) * (1 - smooth((v - .65) / .35));
  const s = i === 1 ? MIDDLE_SNAP : 1;
  return {pitch: s * (-REAR * rear + SNAP_DOWN * snap), k: Math.sin(Math.PI * v)};
}

// A squabble over its progress u: a fast turn in, two snapping jabs, and away again.
export function squabPose(u) {
  if (!(u > 0) || !(u < 1)) return {turn: 0, jab: 0};
  const e = smooth(u / .15) * (1 - smooth((u - .75) / .25));
  return {turn: e, jab: e * Math.max(0, Math.sin(u * TAU * 2.2))};
}

function setup(a) {
  const st = {seed: ((a.g.id ?? 1) * 69621) % 2147483647 || 1, life: 1, T: 0, off: new Map(), lastHit: null, jerk: 0, jerkT: 0,
    heads: a.heads.map((h, i) => ({base: h.rotation.y, side: i === 1 ? 0 : i ? 1 : -1, y: 0, x: 0, ty: 0, tx: 0, next: 0, sniff: 0,
      jerk: {y: 0, x: 0, z: 0}})),
    squab: null, squabWait: SQUAB_MIN, feint: null, feintWait: FEINT_MIN};
  st.heads.forEach(h => { h.next = rand(st) * LOOK_MIN; });
  st.squabWait = SQUAB_MIN + rand(st) * SQUAB_SPAN;
  return st;
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since. The
// match has a tolerance: actions.js adds the middle head's pitch after us and takes it back before
// us, and that round trip isn't always exact in floating point.
function offset(st, obj, prop, axis, v) {
  const key = obj.uuid + prop + axis, o = st.off.get(key);
  if (o && Math.abs(obj[prop][axis] - o.out) < 1e-9) obj[prop][axis] -= o.v;
  obj[prop][axis] += v;
  st.off.set(key, {v, out: obj[prop][axis]});
}

function sense(a, look) {
  const g = a.g;
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return {b: wrap(Math.atan2(dx, dz) - g.rotation.y), d};
}

// Call once a frame (fidget.js does). `busy` is true while it moves or acts; `look` is the hero's
// position (same parent as actor.g). Returns the state, or null for anything else.
export function updateCerberusHeads(a, dt, t, busy, look = null, walking = false) {
  if (!isCerberus(a)) return null;
  const st = a.cerberusHeads || (a.cerberusHeads = setup(a));
  dt = a.stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < EPS) st.life = 0;
  const live = !dead && !a.stone && dt > 0;
  const h = dead ? null : sense(a, look);

  // a blow: each head jerks its own way, one after another
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) {
    st.lastHit = cur; st.jerk = 1; st.jerkT = 0;
    for (const s of st.heads) {
      s.jerk = {y: (rand(st) * 2 - 1) * JERK, x: (rand(st) - .65) * JERK, z: (rand(st) * 2 - 1) * JERK * .6};
      // a lucky roll must never leave a head standing still under a blow
      const big = Math.max(Math.abs(s.jerk.y), Math.abs(s.jerk.x), Math.abs(s.jerk.z)), k = big < JERK * .6 ? JERK * .6 / Math.max(big, 1e-6) : 1;
      s.jerk.y *= k; s.jerk.x *= k; s.jerk.z *= k;
    }
  }
  st.jerkT += dt;
  st.jerk = st.jerk > EPS ? st.jerk * Math.exp(-JERK_DECAY * dt) : 0;

  // squabbles, only when alone and still; feints, only near the hero and still
  const still = !busy && !walking;
  if (live && still && !h && !st.squab) {
    st.squabWait -= dt;
    if (st.squabWait <= 0) { st.squab = {side: rand(st) < .5 ? 0 : 2, u: 0}; st.squabWait = SQUAB_MIN + rand(st) * SQUAB_SPAN; }
  }
  if (st.squab) { st.squab.u += dt / SQUAB_LEN; if (st.squab.u >= 1 || h || !still) st.squab = null; }
  if (live && still && h && !st.feint) {
    st.feintWait -= dt;
    if (st.feintWait <= 0) { st.feint = {head: Math.floor(rand(st) * 3), u: 0}; st.feintWait = FEINT_MIN + rand(st) * FEINT_SPAN; }
  }
  if (st.feint) { st.feint.u += dt / FEINT_LEN; if (st.feint.u >= 1 || !h || !still) st.feint = null; }

  const atk = !dead && cur?.kind === 'attack' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
  const sq = st.squab ? squabPose(st.squab.u) : null;
  const w = st.life;

  a.heads.forEach((head, i) => {
    const s = st.heads[i];
    // where this head wants to look
    if (h) {
      s.ty = clamp(wrap(h.b - s.base), -YAW, YAW); s.tx = LOWER; s.next = 0;
    } else if (walking || busy) {
      s.ty = 0; s.tx = 0; s.next = Math.min(s.next, LOOK_MIN);
    } else if (live) {
      s.next -= dt;
      if (s.next <= 0) {
        const [lo, hi] = s.side ? SCAN.side : SCAN.middle;
        s.ty = (s.side || 1) * (lo + (hi - lo) * rand(st));
        s.tx = PITCH[0] + (PITCH[1] - PITCH[0]) * rand(st);
        if (rand(st) < SNIFF) s.sniff = SNIFF_LEN;
        s.next = LOOK_MIN + LOOK_SPAN * rand(st);
      }
    }
    if (dead) { s.ty = 0; s.tx = 0; }
    const rate = h ? LOCK_RATE : RATE;
    s.y = approach(s.y, s.ty, rate, dt); s.x = approach(s.x, s.tx, rate, dt);
    s.sniff = Math.max(0, s.sniff - dt);

    let yaw = s.y, pitch = s.x, roll = 0;
    // sniffing nods
    if (s.sniff > 0) pitch += SNIFF_AMP * Math.sin((SNIFF_LEN - s.sniff) * SNIFF_HZ * TAU) * smooth(s.sniff / .15);
    // growling, each head out of step
    if (h) { const gr = GROWL * Math.sin(st.T * GROWL_HZ * TAU + i * 2.1); pitch += gr; roll += gr * .7; }
    // walking nods
    if (walking && !dead) pitch += WALK_NOD * Math.sin(st.T * WALK_HZ * TAU + i * 2.1);
    // the squabble
    if (sq) {
      if (i === st.squab.side) { yaw += -s.side * SQUAB_TURN * sq.turn; pitch += SQUAB_JAB * sq.jab; roll += -s.side * .12 * sq.turn; }
      else if (i === 1) { const away = st.squab.side === 0 ? 1 : -1; yaw += away * FLINCH * sq.turn; pitch -= .14 * sq.turn; }
    }
    // a feint at the hero
    if (st.feint?.head === i) { const u = st.feint.u, e = Math.sin(Math.PI * clamp01(u)); pitch += FEINT * smooth(u / .3) * (1 - smooth((u - .45) / .55)) - .06 * e; }
    // the bite in turn
    if (atk) { const b = bitePose(i, q.u ?? 0); pitch += b.pitch; }
    // the blow
    if (st.jerk) {
      const k = st.jerk * smooth((st.jerkT - i * JERK_LAG) / .05);
      yaw += s.jerk.y * k; pitch += s.jerk.x * k; roll += s.jerk.z * k;
    }
    offset(st, head, 'rotation', 'y', yaw * w);
    offset(st, head, 'rotation', 'x', pitch * w);
    offset(st, head, 'rotation', 'z', roll * w);
  });
  return st;
}
