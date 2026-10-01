// The locust's hop (creature animation queue). The locust (locust.js) used to stand stock still
// apart from the tripod walk. Now it twitches about like something waiting to swarm:
//  - Alone, now and then it springs straight up in a short hop: the hind legs cock, then fling
//    back and up as the body leaps nose-first; it hangs a moment with the front legs drawn up,
//    lands nose-down and settles with a little squash. It lands at a slightly different angle.
//  - Within RANGE tiles of the hero it hops far more often and higher, and each hop twists it in
//    mid-air to face them (plus a random jink, so it lands askew and corrects on the next one).
//    Between hops it stridulates at them: the hind legs saw against the wings in quick rasping
//    bursts while the body trembles. The head tracks the hero.
//  - A bite is a leap: it crouches, springs up and forward at the hero with the hind legs
//    trailing, and drops its head into the bite.
//  - A blow startles it into a small, quick hop.
//  - On death everything eases to the exact rest pose; turned to stone (`a.stone`) it holds.
//
// Called from ant-jaws.js (the S_ANT motion module), which fidget.js calls every frame. The body's
// height and the legs' pitch are written absolutely by live.js and tripod.js each frame, so the hop
// adds on top of whatever they wrote (and takes its own offset back only when nobody did). The
// body's pitch, yaw, roll and forward shift and the head's pitch and yaw are offsets taken back
// every frame, so they never drift.

// Hero sensing: range (tiles), how far the head turns (rad).
export const RANGE = 5, HEAD_YAW = .5;
// A hop: length (s) and height (body units; the locust is 1.15 scale, its thorax .12 up).
export const HOP_LEN = .6, HOP_H = .07;
// Hop gaps (s, min + span): alone and with the hero in range. The first comes after FIRST s.
export const GAP = {alone: [4, 5], near: [1.4, 1.6]}, FIRST = [1, 3];
// How far a hop may turn it toward the hero (rad) and the random jink on top.
export const TURN_MAX = 1.2, JINK = .3;
// Stridulation: burst length (s), gap (min + span, s), rate (Hz) and leg amplitude (rad).
export const RASP = {len: .7, gap: [.8, 1.4], hz: 16, amp: .14};
// A startle hop (after a blow) runs this fraction of a hop's length and height.
export const STARTLE = {len: .55, h: .5};
export const REST_RATE = 3;
const SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const bump = (v, a, b) => Math.sin(clamp01((v - a) / (b - a)) * Math.PI);
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const hops = a => !!(a && !a.asset && a.hopper === 'locust' && a.g && a.body && a.head && a.legs?.length === 6);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// One hop at progress f (0..1): {y (-.35..1, times the hop's height), pitch (rad, + is nose down),
// kick (hind legs, rad), tuck (front legs, rad), turn (0..1, how much of the hop's turn is done)}.
// Crouch, spring nose-up with the hind legs flung back, hang with the front legs drawn up, land
// nose-down with a squash.
export function hopPose(f) {
  if (!(f > 0) || !(f < 1)) return {y: 0, pitch: 0, kick: 0, tuck: 0, turn: f >= 1 ? 1 : 0};
  const crouch = smooth(f / .28) * (1 - smooth((f - .28) / .06));
  const s = clamp01((f - .32) / .46), air = 4 * s * (1 - s), land = bump(f, .76, 1);
  return {
    y: -.3 * crouch + air - .3 * land,
    pitch: .08 * crouch - .32 * bump(f, .3, .62) + .22 * bump(f, .55, .92) + .1 * land,
    kick: -.18 * crouch + .95 * bump(f, .3, .86),
    tuck: -.35 * bump(f, .34, .8),
    turn: smooth((f - .34) / .42),
  };
}

// The leaping bite at action phase u (0..1): {y, z (forward, body units), pitch, kick, head (+ is
// head down)}.
export function leapPose(u) {
  if (!(u > 0) || !(u < 1)) return {y: 0, z: 0, pitch: 0, kick: 0, head: 0};
  const crouch = smooth(u / .22) * (1 - smooth((u - .22) / .06));
  return {
    y: -.02 * crouch + .055 * bump(u, .25, .75),
    z: .09 * bump(u, .25, 1),
    pitch: .06 * crouch - .25 * bump(u, .25, .5) + .3 * bump(u, .45, .9),
    kick: -.15 * crouch + 1 * bump(u, .25, .85),
    head: .4 * bump(u, .45, .95),
  };
}

function setup(a) {
  const st = {seed: ((a.g?.id ?? 1) * 48271) % 2147483647 || 1, life: 1, T: 0,
    hop: null, len: HOP_LEN, h: 1, from: 0, to: 0, face: 0, wait: 0,
    rasp: null, raspWait: 0, lastHit: null, act: 1, headYaw: 0,
    applied: {pitch: 0, yaw: 0, roll: 0, z: 0, hp: 0, hy: 0},
    left: {y: null, dy: 0, legs: a.legs.map(() => null), dl: a.legs.map(() => 0)}};
  st.wait = FIRST[0] + FIRST[1] * rand(st);
  st.raspWait = RASP.gap[0] + RASP.gap[1] * rand(st);
  st.ph = rand(st) * Math.PI * 2;
  // hind legs sit furthest back on each side; the rest are front legs
  const back = s => a.legs.map((l, i) => i).filter(i => (a.legs[i].position.x < 0 ? -1 : 1) === s)
    .sort((i, j) => a.legs[i].position.z - a.legs[j].position.z)[0];
  st.hind = [back(1), back(-1)];
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's bearing relative to the locust's facing (g), or null when out of range.
function sense(a, look) {
  const g = a.g;
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return {b: wrap(Math.atan2(dx, dz) - g.rotation.y), d};
}

// Add v to o[k] on top of what was written this frame; take back the last offset only if the
// value is still the one this module left (nobody rewrote it).
function stack(o, k, v, left, dKey, lKey, idx) {
  const L = idx == null ? left[lKey] : left[lKey][idx], d = idx == null ? left[dKey] : left[dKey][idx];
  if (L !== null && o[k] === L) o[k] -= d;
  o[k] += v;
  if (idx == null) { left[lKey] = o[k]; left[dKey] = v; } else { left[lKey][idx] = o[k]; left[dKey][idx] = v; }
}

// Call once a frame (via ant-jaws.js from fidget.js). `busy` holds off a hop while it moves or
// acts; `look` is the hero's position (same parent as actor.g); `walking` eases the hop out.
export function updateLocustHop(a, dt, t, busy, look = null, walking = false) {
  if (!hops(a)) return null;
  const st = a.locustHop_ || (a.locustHop_ = setup(a));
  const dead = !!a.actions?.dead, stone = !!a.stone;
  dt = stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life, h = dead || stone ? null : sense(a, look);

  // a blow startles it into a quick hop (not mid-hop)
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  const startle = hit && hit !== st.lastHit;
  if (hit) st.lastHit = hit;
  const begin = (len, height, to) => { st.hop = 0; st.len = len; st.h = height; st.from = st.face; st.to = to; };
  if (startle && st.hop == null && !stone) begin(HOP_LEN * STARTLE.len, STARTLE.h, st.face + (rand(st) * 2 - 1) * JINK * .5);

  // hops: rarer alone, often (and turning to face the hero) with the hero near
  if (st.hop != null) {
    st.hop += dt / st.len;
    if (st.hop >= 1) { st.hop = null; st.face = st.to; }
  } else if (!dead && !stone) {
    st.wait -= dt;
    if (st.wait <= 0 && !busy) {
      const [g0, gs] = h ? GAP.near : GAP.alone;
      st.wait = g0 + gs * rand(st);
      const jink = (rand(st) * 2 - 1) * JINK;
      begin(HOP_LEN, h ? 1 : .6, h ? clamp(h.b, -TURN_MAX, TURN_MAX) + jink : clamp(st.face * .5 + jink, -TURN_MAX, TURN_MAX));
      st.rasp = null;
    }
  }
  // walking: g turns along the path, so the held turn eases away
  if (walking && st.hop == null) st.face = approach(st.face, 0, 4, dt);

  // stridulation with the hero near, between hops
  if (st.rasp != null) { st.rasp += dt / RASP.len; if (st.rasp >= 1 || st.hop != null || !h) st.rasp = null; }
  else if (h && st.hop == null && !busy) {
    st.raspWait -= dt;
    if (st.raspWait <= 0) { st.rasp = 0; st.raspWait = RASP.gap[0] + RASP.gap[1] * rand(st); }
  }

  // a bite or walking eases the idle hop and rasp out (never a jump)
  const atk = dead ? null : current(a, 'attack');
  st.act = approach(st.act, atk || walking ? 0 : 1, 10, dt);
  const k = st.act * w;
  const p = hopPose(st.hop ?? 0), lp = atk ? leapPose(a.actions.u ?? 0) : leapPose(0);
  const yaw = (st.hop != null ? st.from + (st.to - st.from) * p.turn : st.face) * w;
  const raspE = st.rasp != null ? bump(st.rasp, 0, 1) ** .4 : 0;
  const saw = raspE * RASP.amp * Math.sin(st.T * RASP.hz * Math.PI * 2 + st.ph) * k;

  // body: height and pitch from the hop and the leap; a trembling roll while it rasps
  const H = HOP_H * st.h;
  stack(a.body.position, 'y', (H * p.y * k + lp.y) * w, st.left, 'dy', 'y');
  const o = st.applied, b = a.body;
  const pitch = (p.pitch * k + lp.pitch) * w, roll = .03 * raspE * Math.sin(st.T * 41) * k, z = lp.z * w;
  b.rotation.x += pitch - o.pitch; b.rotation.y += yaw - o.yaw; b.rotation.z += roll - o.roll; b.position.z += z - o.z;
  o.pitch = pitch; o.yaw = yaw; o.roll = roll; o.z = z;

  // legs: the hind pair kick (and saw), the front four tuck in the air
  a.legs.forEach((l, i) => {
    const hind = st.hind.includes(i);
    const v = hind ? (p.kick * k + lp.kick + (i === st.hind[0] ? saw : -saw)) * w : (p.tuck * k - .2 * lp.kick) * w;
    stack(l.rotation, 'x', v, st.left, 'dl', 'legs', i);
  });

  // head: tracks the hero (relative to the body's own turn), drops into the bite
  st.headYaw = approach(st.headYaw, h ? clamp(wrap(h.b - st.face), -HEAD_YAW, HEAD_YAW) : 0, 5, dt);
  const hp = (lp.head - .5 * p.pitch * k) * w, hy = st.headYaw * w;
  a.head.rotation.x += hp - o.hp; a.head.rotation.y += hy - o.hy;
  o.hp = hp; o.hy = hy;
  return st;
}
