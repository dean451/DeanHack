// The ninja's hood tails (ninja.js hoodTails): the two long ragged tails of the zukin's knot.
//  - They hang on springs from the knot, so they lag, overshoot and settle instead of hanging stiff.
//  - Moving, they stream out behind against the ninja's travel (sideways travel throws them
//    sideways), lifting further the faster it goes, and flutter: each tail its own quick snapping
//    ripple, out of step with the other.
//  - Turning (the body or the head) swings them round behind, late.
//  - Standing, a faint draught stirs them now and then.
//  - Attacking, they whip back hard with the cut; a blow snaps them up and out behind.
//  - They rest against the back, so they never swing forward through it: they slap against it and stop.
//  - Death: they fall slack and settle at rest. Turned to stone (`a.stone`): they hold.
// The tails are this module's own groups, so it writes their rotation outright from TAIL_REST.
// No extra draws (the two tail meshes are the ninja's own, ninja.js).
import {TAIL_REST} from './ninja.js';

const TAU = Math.PI * 2;
// Spring stiffness (1/s²) and damping (1/s): a little under critical, so a stop swings them past
// and back once or twice.
export const STIFF = 60, DAMP = 7;
// Streaming: lift per tile/s of travel against the head's facing (rad), and its cap; sideways
// throw per tile/s, and its cap. Travel speed is the actor's own displacement, smoothed.
export const LIFT = .32, LIFT_MAX = 1.25, THROW = .22, THROW_MAX = .6;
// Turning lag: swing per rad/s of the head's world yaw, and its cap.
export const LAG = .09, LAG_MAX = .5;
// Flutter while moving: amplitude (rad, at full stream) and rate (Hz); the second tail runs at
// FLUTTER_SKEW times the rate, so they never ripple together.
export const FLUTTER = .16, FLUTTER_HZ = 3.1, FLUTTER_SKEW = 1.37;
// The draught when standing: gap (s), length (s) and strength (rad).
export const DRAUGHT_MIN = 3, DRAUGHT_SPAN = 5, DRAUGHT_LEN = 2.2, DRAUGHT = .12;
// The cut's whip back (x) and out (z), and the kick of a blow (an impulse, rad/s).
export const WHIP = .9, WHIP_OUT = .25, BLOW_KICK = 7;
// How far each tail may swing from rest: back/up (x) and to the side (z), rad. x never goes below
// rest, where the tail lies against the back.
export const SWING_X = 1.5, SWING_Z = 1.1;
// Travel above this many tiles in a frame is a teleport or a level change: no stream.
const JUMP = 1.5, SPEED_RATE = 8, SNAP = 1e-4;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const isNinja = a => !!(a && !a.asset && a.kind === 'ninja' && a.g && a.head && a.hoodTails?.length === TAIL_REST.length);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The cut over action progress u: the tails whip back as the blade comes through, then fall away.
export const whipCurve = u => !(u > 0) || !(u < 1) ? 0 : smooth((u - .2) / .25) * (1 - smooth((u - .55) / .45));
// A draught over its progress v: swells and dies away.
export const draughtCurve = v => !(v > 0) || !(v < 1) ? 0 : Math.sin(Math.PI * v) ** 2;

function setup(a) {
  const seed = ((a.g.id ?? 1) * 48271) % 2147483647 || 1;
  const st = {seed, T: 0, last: null, yaw: null, vx: 0, vz: 0, turn: 0, lastHit: null,
    draught: null, draughtWait: 0, tails: TAIL_REST.map(() => ({x: 0, z: 0, wx: 0, wz: 0}))};
  st.draughtWait = DRAUGHT_MIN + DRAUGHT_SPAN * rand(st);
  st.phase = rand(st) * TAU;
  st.side = rand(st) < .5 ? -1 : 1;
  return st;
}

// Call once a frame (fidget.js does). `busy` is true while it moves or acts. Returns the state, or null.
export function updateNinjaTails(a, dt, t, busy) {
  if (!isNinja(a)) return null;
  const st = a.ninjaTails || (a.ninjaTails = setup(a));
  dt = a.stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  const p = a.g.position, yaw = a.g.rotation.y + a.head.rotation.y;

  // Travel and turning, in the head's frame (its facing is +z), smoothed.
  let vx = 0, vz = 0, turn = 0;
  if (dt > 0 && st.last) {
    const dx = p.x - st.last.x, dz = p.z - st.last.z;
    if (Math.hypot(dx, dz) < JUMP && !dead) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      vx = (dx * c - dz * s) / dt; vz = (dx * s + dz * c) / dt;
      turn = wrap(yaw - st.yaw) / dt;
    }
  }
  if (dt > 0) st.last = {x: p.x, z: p.z};
  if (dt > 0) st.yaw = yaw;
  st.vx = approach(st.vx, vx, SPEED_RATE, dt);
  st.vz = approach(st.vz, vz, SPEED_RATE, dt);
  st.turn = approach(st.turn, Number.isFinite(turn) ? turn : 0, SPEED_RATE, dt);
  st.T += dt;

  // A blow snaps them up and out behind.
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) {
    st.lastHit = cur;
    for (const k of st.tails) k.wx += BLOW_KICK * (.8 + .4 * rand(st));
  }
  // A draught, only standing.
  if (!busy && !dead && !st.draught) {
    st.draughtWait -= dt;
    if (st.draughtWait <= 0) { st.draught = {v: 0, dir: rand(st) < .5 ? -1 : 1}; st.draughtWait = DRAUGHT_MIN + DRAUGHT_SPAN * rand(st); }
  }
  let draught = 0;
  if (st.draught) {
    st.draught.v += dt / DRAUGHT_LEN * (busy ? 3 : 1);
    draught = draughtCurve(st.draught.v) * st.draught.dir;
    if (st.draught.v >= 1) st.draught = null;
  }
  const atk = !dead && cur?.kind === 'attack' && (q.age ?? 0) >= (cur.wait ?? 0) ? whipCurve(q.u ?? 0) : 0;

  // Backward travel would blow them forward into the back, so it does nothing.
  const speed = Math.hypot(st.vx, st.vz);
  const lift = clamp(st.vz * LIFT, 0, LIFT_MAX);
  const thrown = clamp(-st.vx * THROW, -THROW_MAX, THROW_MAX);
  const lag = clamp(st.turn * LAG, -LAG_MAX, LAG_MAX);
  const stream = clamp01(speed / 3);

  st.tails.forEach((k, i) => {
    const hz = FLUTTER_HZ * (i ? FLUTTER_SKEW : 1), ph = st.T * hz * TAU + st.phase + i * 2.1;
    // a snapping ripple: mostly a sine, sharpened at its crests
    const flap = Math.sin(ph) + .35 * Math.sin(2 * ph + .7);
    const tx = dead ? 0 : lift + FLUTTER * stream * flap + WHIP * atk + DRAUGHT * .4 * Math.abs(draught);
    const tz = dead ? 0 : thrown + lag + FLUTTER * .5 * stream * Math.sin(ph * .7 + i) + st.side * WHIP_OUT * atk * (i ? 1 : -1)
      + DRAUGHT * draught * (i ? .8 : 1.2);
    // semi-implicit spring, in substeps so a long frame stays stable
    const n = Math.ceil(dt / .02);
    for (let j = 0; j < n; j++) {
      const h = dt / n;
      k.wx += (STIFF * (tx - k.x) - DAMP * k.wx) * h; k.x += k.wx * h;
      k.wz += (STIFF * (tz - k.z) - DAMP * k.wz) * h; k.z += k.wz * h;
    }
    // the back stops it dead; the limits stop it wrapping over the head
    if (k.x < 0) { k.x = 0; if (k.wx < 0) k.wx = 0; }
    if (k.x > SWING_X) { k.x = SWING_X; if (k.wx > 0) k.wx = 0; }
    k.z = clamp(k.z, -SWING_Z, SWING_Z);
    if (dead && Math.abs(k.x) + Math.abs(k.z) + Math.abs(k.wx) + Math.abs(k.wz) < SNAP) k.x = k.z = k.wx = k.wz = 0;
    const r = TAIL_REST[i].rot, g = a.hoodTails[i];
    g.rotation.set(r[0] + k.x, r[1], r[2] + k.z);
  });
  return st;
}
