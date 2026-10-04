// The ants' jaws (creature animation queue item 7, the last part). Giant, soldier, fire and snow
// ants (ant.js) now work their mandibles, which used to be fixed in the head mesh.
//  - At rest the jaws hold a little open and tremble, and now and then scissor shut: a clack, or
//    two or three in a row. A soldier ant clacks often and in bursts, a fire ant quick and
//    nervous, a snow ant slow. The head ticks to a new angle between clacks, the way an ant's does.
//  - Within RANGE tiles the head turns to the hero and the jaws gape and hold wide, trembling,
//    the wider the nearer. Now and then it threatens: the head rears up with the jaws spread to
//    their widest and shuddering, then lunges a little and snaps them shut.
//  - Walking, the jaws scissor in time with the stride.
//  - A bite: the jaws spread wide, the head drops and lunges, and they slam shut past rest; then
//    the head worries the bite, three fast side-to-side shakes like an ant tearing at its prey.
//  - A blow: the jaws splay and quiver, the head flinches up; it fades.
//  - On death everything eases to the exact rest pose.
//
// The module owns the jaws' rotation.y (written absolutely from rest every frame). The head's
// pitch and yaw are offsets taken back each frame (actions.js and bask.js do the same), so they
// never drift. No extra draws beyond the two jaw meshes ant.js now has.
// The locust (another S_ANT, no jaws) hops instead: updateAntJaws hands it to locust-hop.js.

import {hops, updateLocustHop} from './locust-hop.js';

// Hero sensing: range (tiles), the most the head turns toward the hero (rad) and how fast.
export const RANGE = 5, FACE_YAW = .45, FACE_RATE = 6;
// Clacks: first after FIRST_MIN..+FIRST_SPAN s, CLACK_LEN s per clack. Threats (hero in range):
// THREAT_LEN s long, first after THREAT_FIRST s.
export const FIRST_MIN = 1, FIRST_SPAN = 2.5, CLACK_LEN = .32, THREAT_LEN = 1.7, THREAT_FIRST = 1.2;
// A blow's splay and how fast it fades (1/s).
export const SPLAY = .5, SPLAY_DECAY = 3;
// The jaws never close more than SHUT past rest, nor open past the look's max.
export const SHUT = .14;
export const REST_RATE = 3;
const SNAP = 1e-3;
// Per kind: the resting gape (rad), how wide they open to clack, gape at the hero and threaten
// (rad), the most they open; clack gap (s) and span, how many clacks in a burst (most), the
// threat gap and span (s); tremble (rad, Hz); how often the head ticks (1/s) and how far (rad).
export const LOOKS = {
  'giant ant': {rest: .1, clack: .32, gape: .38, threat: .55, max: .62, gap: 3, span: 4, burst: 2, tGap: 4, tSpan: 4, trem: .018, hz: 17, tick: .5, tickYaw: .22},
  'soldier ant': {rest: .14, clack: .42, gape: .55, threat: .78, max: .85, gap: 1.6, span: 2.6, burst: 3, tGap: 2.6, tSpan: 3, trem: .028, hz: 21, tick: .8, tickYaw: .26},
  'fire ant': {rest: .08, clack: .3, gape: .35, threat: .5, max: .56, gap: 1.2, span: 2, burst: 2, tGap: 3, tSpan: 3, trem: .03, hz: 26, tick: 1.3, tickYaw: .3},
  'snow ant': {rest: .08, clack: .28, gape: .32, threat: .48, max: .52, gap: 4, span: 5, burst: 1, tGap: 5, tSpan: 4, trem: .01, hz: 9, tick: .3, tickYaw: .16},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const chews = a => !!(a && !a.asset && a.antJaws && a.head && Array.isArray(a.jaws) && a.jaws.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// One clack at progress f (0..1): the extra gape (1 = the look's clack width). It spreads, slams
// shut past rest (to -.35, about SHUT), then the stiff mandibles rebound open a hair (.1) and
// settle, as if the clack jarred them.
export function clackPose(f) {
  if (!(f > 0) || !(f < 1)) return 0;
  return smooth(f / .5) * (1 - smooth((f - .5) / .12)) - .35 * Math.sin(clamp01((f - .6) / .22) * Math.PI)
    + .1 * Math.sin(clamp01((f - .82) / .18) * Math.PI);
}

// n clacks in a row over u (0..1).
export function burstPose(u, n = 1) {
  if (!(u > 0) || !(u < 1)) return 0;
  const s = u * Math.max(1, n | 0);
  return clackPose(s - Math.floor(s));
}

// The threat at progress u (0..1): {rear (0..1), spread (0..1), shake (0..1), snap (-.35..1)}.
// The head rears and the jaws spread wide and shudder, then it lunges and snaps them shut.
export function threatPose(u) {
  if (!(u > 0) || !(u < 1)) return {rear: 0, spread: 0, shake: 0, snap: 0};
  const up = smooth(u / .25), down = smooth((u - .7) / .12);
  const spread = up * (1 - down);
  return {rear: up * (1 - smooth((u - .66) / .2)) - .4 * Math.sin(clamp01((u - .7) / .3) * Math.PI),
    spread, shake: smooth((u - .2) / .15) * (1 - down), snap: -.35 * Math.sin(clamp01((u - .8) / .2) * Math.PI)};
}

// The bite at action phase u (0..1): {open (-.35..1), lunge (0..1), worry (-1..1)}. The worry is
// the head's shake after the jaws shut, three swings fading out to exactly zero.
export function bitePose(u) {
  if (!(u > 0) || !(u < 1)) return {open: 0, lunge: 0, worry: 0};
  const w = clamp01((u - .6) / .4);
  return {open: smooth(u / .38) * (1 - smooth((u - .45) / .1)) - .35 * Math.sin(clamp01((u - .52) / .48) * Math.PI),
    lunge: Math.sin(clamp01((u - .3) / .6) * Math.PI),
    worry: Math.sin(w * Math.PI * 6) * Math.sin(w * Math.PI)};
}

function setup(a) {
  const st = {seed: ((a.g?.id ?? 1) * 69621) % 2147483647 || 1, life: 1, look: LOOKS[a.antJaws] || LOOKS['giant ant'],
    rest: a.jaws.map(j => j.rotation.y), applied: {pitch: 0, yaw: 0},
    near: 0, face: 0, wait: 0, clack: null, n: 1, threat: null, tWait: 0, splay: 0, lastHit: null,
    tickWait: 0, tick: 0, tickTo: 0, gape: 0, stride: 0, act: 1, T: 0};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.tWait = THREAT_FIRST + st.look.tSpan * .5 * rand(st);
  st.tickWait = rand(st) / st.look.tick;
  st.ph = rand(st) * Math.PI * 2;
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

// Call once a frame (fidget.js does). `busy` holds off a clack or threat while it moves or acts;
// `look` is the hero's position (same parent as actor.g); `walking` scissors the jaws.
export function updateAntJaws(a, dt, t, busy, look = null, walking = false) {
  if (hops(a)) return updateLocustHop(a, dt, t, busy, look, walking);
  if (!chews(a)) return null;
  const st = a.antJaws_ || (a.antJaws_ = setup(a));
  const L = st.look, dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // the hero: turn to them and gape, the nearer the wider
  const h = dead ? null : sense(a, look);
  st.near = approach(st.near, h ? 1 - h.d / RANGE * .6 : 0, 4, dt);
  st.face = approach(st.face, h ? clamp(h.b, -FACE_YAW, FACE_YAW) : 0, FACE_RATE, dt);

  // a blow: splay and quiver, then recover
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.splay = 1; }
  st.splay *= Math.exp(-SPLAY_DECAY * dt);
  if (st.splay < SNAP) st.splay = 0;
  const sp = st.splay;

  // the bite
  const atk = dead ? null : current(a, 'attack');
  const bite = atk ? bitePose(a.actions.u ?? 0) : bitePose(0);

  // clacks any time it stands; threats only with the hero in range; one at a time
  if (st.clack != null) { st.clack += dt / (CLACK_LEN * st.n); if (st.clack >= 1) st.clack = null; }
  else if (!dead && st.threat == null) {
    st.wait -= dt;
    if (st.wait <= 0 && !busy) { st.clack = 0; st.n = 1 + Math.floor(rand(st) * L.burst); st.wait = L.gap + L.span * rand(st); }
  }
  if (st.threat != null) { st.threat += dt / THREAT_LEN; if (st.threat >= 1) st.threat = null; }
  else if (!dead && h && st.clack == null) {
    st.tWait -= dt;
    if (st.tWait <= 0 && !busy) { st.threat = 0; st.tWait = L.tGap + L.tSpan * rand(st); }
  }
  // a bite or a blow eases a clack or threat out (never a jump)
  st.act = approach(st.act, atk || sp > .2 ? 0 : 1, 12, dt);
  const k = st.act, cl = burstPose(st.clack ?? 0, st.n) * k, th0 = threatPose(st.threat ?? 0);
  const th = {rear: th0.rear * k, spread: th0.spread * k, shake: th0.shake * k, snap: th0.snap * k};

  // the head ticks to a new angle between clacks (a held angle, then a jerk)
  st.tickWait -= dt;
  if (st.tickWait <= 0 && !dead) { st.tickTo = (rand(st) * 2 - 1) * L.tickYaw * (1 - .7 * st.near); st.tickWait = (.4 + 1.2 * rand(st)) / L.tick; }
  st.tick = approach(st.tick, dead ? 0 : st.tickTo, 22, dt);

  // walking: scissor with the stride
  st.stride = approach(st.stride, walking && !dead ? 1 : 0, 6, dt);

  // the jaws: rest gape, held gape at the hero, clacks, the threat, the bite, the splay; a tremble on top
  st.gape = approach(st.gape, (L.gape - L.rest) * st.near, 3, dt);
  const shake = 1 + 1.6 * th.shake + 2 * sp + .8 * st.near;
  const open = L.rest + st.gape + L.clack * cl + (L.threat - L.rest) * th.spread + L.threat * th.snap
    + L.max * bite.open + .12 * st.stride * Math.sin(st.T * 11 + st.ph) + SPLAY * sp;
  a.jaws.forEach((jaw, i) => {
    const side = jaw.userData.side || (i ? -1 : 1);
    const trem = L.trem * shake * Math.sin(st.T * L.hz * Math.PI * 2 * (1 + .13 * i) + st.ph + i * 1.7);
    const v = clamp(open + trem, -SHUT, L.max);
    jaw.rotation.y = st.rest[i] + side * v * w;
  });

  // the head: the tick and the turn to the hero, rearing in a threat, dropping into a bite, a flinch
  const pitch = (-.38 * th.rear + .28 * bite.lunge - .25 * sp * (1 + .3 * Math.sin(st.T * 23))) * w;
  const yaw = (st.tick + st.face * (.4 + .6 * st.near) + .3 * bite.worry) * w;
  const hd = a.head, o = st.applied;
  hd.rotation.x += pitch - o.pitch; hd.rotation.y += yaw - o.yaw;
  o.pitch = pitch; o.yaw = yaw;
  return st;
}
