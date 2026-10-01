// Weeping angels (weeping-angel.js): stone that only moves when you aren't looking.
//  - Dead still. No breath, no sway: live.js's idle bob is taken off the body.
//  - Quantum locked: while the hero is within RANGE tiles it never moves smoothly. Each time the
//    hero takes a step (or the angel finishes a move of its own) it is suddenly in a new pose, one
//    CREEP_STEPS notch nearer to striking: turned on the hero, head lifting out of its bow and
//    cocked a little differently each time, hands slipping down off its eyes, leaning in, wings
//    easing open. Once the hero steps away out of range, it is back at rest, all at once.
//  - Attacks snap in and out with no wind-up: on a claw or touch the hands tear down from the face
//    and reach for the hero, the head comes up on the gaping mouth and the wings flare; on its gaze
//    (UnNetHack's AD_BLNK) the hands pull wide off the face and the head lifts to stare. actions.js
//    leaves this actor's arm alone in attacks (`ownsAttackArms`).
//  - A blow: a short stone tremor, no flinch.
//  - Death: the pose eases back to rest. Turned to stone (`a.stone`): it holds.
// Handles used: body, head, arms (both), stoneWings. No extra draws.
import {WEEPING_ANGELS} from './weeping-angel.js';

const TAU = Math.PI * 2;
// Hero sensing (tiles) and how far the hero must move to count as a step (units).
export const RANGE = 6, STEP = .5;
// Creep: notches, and at the last notch the head lift, hand slip and spread, lean and wing spread (rad).
export const CREEP_STEPS = 3, HEAD_LIFT = .3, HAND_SLIP = .34, HAND_SPREAD = .08, LEAN = .07, WING_OPEN = .12;
// The most the body turns to the hero (rad), and the head's cock either way per snap (rad).
export const TURN = .6, TILT = .14;
// Attacks: per kind the arm reach and spread, head lift, lean, and the wing flare (y and z).
export const ATTACK = {
  reach: {arm: .85, spread: .18, head: .45, lean: .1, wingY: .35, wingZ: .2},
  gaze: {arm: .45, spread: .55, head: .55, lean: .04, wingY: .5, wingZ: .3},
};
// A blow's tremor: size (rad), frequency (Hz), decay (1/s).
export const TREMOR = .02, TREMOR_HZ = 21, TREMOR_DECAY = 7;
export const REST_RATE = 3;
const SNAP = 1e-3;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const isWeepingAngel = a => !!(a && !a.asset && WEEPING_ANGELS.includes(a.kind) && a.g && a.body && a.head && a.arms?.length === 2 && a.stoneWings?.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The attack envelope over action progress u: it is simply there almost at once, holds, and is
// gone again just as suddenly. No ease-in that would show it moving.
export function lungeCurve(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth(u / .08) * (1 - smooth((u - .82) / .1));
}
export const attackLook = kind => kind === 'gaze' ? ATTACK.gaze : ATTACK.reach;

// The pose for creep notch c, the turn and cock taken at the last snap.
export function creepPose(c, turn = 0, tilt = 0) {
  const k = clamp01(c / CREEP_STEPS);
  return {yaw: c > 0 ? clamp(turn, -TURN, TURN) : 0, lean: LEAN * k, head: -HEAD_LIFT * k, tilt: tilt * k,
    arm: HAND_SLIP * k, spread: HAND_SPREAD * k, wingY: WING_OPEN * k, wingZ: 0};
}

function setup(a) {
  const st = {seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, life: 1, creep: 0, turn: 0, tilt: 0, anchor: null,
    walked: false, tremor: 0, T: 0, off: new Map()};
  a.ownsAttackArms = true;
  return st;
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since.
function offset(st, obj, prop, axis, v) {
  const key = obj.uuid + prop + axis, o = st.off.get(key);
  if (o && obj[prop][axis] === o.out) obj[prop][axis] -= o.v;
  obj[prop][axis] += v;
  st.off.set(key, {v, out: obj[prop][axis]});
}

function sense(a, look) {
  const g = a.g;
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  return {b: d > 1e-3 ? wrap(Math.atan2(dx, dz) - g.rotation.y) : 0, d};
}

// Call once a frame (fidget.js does). `busy` is true while it moves or acts; `look` is the hero's
// position (same parent as actor.g). Returns the state, or null for anything else.
export function updateWeepingLunge(a, dt, t, busy, look = null) {
  if (!isWeepingAngel(a)) return null;
  const st = a.weepingLunge || (a.weepingLunge = setup(a));
  // stone that never breathes (live.js bobs every body; it writes this fresh each frame)
  a.body.position.y = 0;
  dt = a.stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;

  // Snaps: the hero stepping, or the angel coming to rest after a move of its own.
  const walking = busy && !cur && !q?.queue?.length;
  const h = sense(a, look);
  let snap = false;
  if (h) {
    if (!st.anchor) st.anchor = {x: look.x, z: look.z};
    else if (Math.hypot(look.x - st.anchor.x, look.z - st.anchor.z) > STEP) { st.anchor.x = look.x; st.anchor.z = look.z; snap = true; }
  }
  if (st.walked && !walking) snap = true;
  st.walked = walking;
  if (snap && !dead && !a.stone) {
    if (h && h.d <= RANGE) {
      st.creep = Math.min(CREEP_STEPS, st.creep + 1);
      st.turn = h.b;
      st.tilt = (rand(st) * 2 - 1) * TILT;
    } else st.creep = st.turn = st.tilt = 0;
  }

  // The attack, snapping in over the creep pose.
  const atk = !dead && cur?.kind === 'attack' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
  const e = atk ? lungeCurve(q.u ?? 0) : 0, A = attackLook(atk?.attack);
  const c = creepPose(st.creep, st.turn, st.tilt), mixv = (from, to) => from + (to - from) * e;
  // a blow: a short tremor through the stone
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) { st.lastHit = cur; st.tremor = 1; }
  st.tremor = st.tremor > SNAP ? st.tremor * Math.exp(-TREMOR_DECAY * dt) : 0;
  const shake = TREMOR * st.tremor * Math.sin(st.T * TREMOR_HZ * TAU);

  const w = st.life;
  offset(st, a.body, 'rotation', 'y', c.yaw * (1 - .4 * e) * w);
  offset(st, a.body, 'rotation', 'x', mixv(c.lean, A.lean) * w);
  offset(st, a.body, 'rotation', 'z', shake * w);
  offset(st, a.head, 'rotation', 'x', mixv(c.head, -A.head) * w);
  offset(st, a.head, 'rotation', 'z', (c.tilt * (1 - e) + .6 * shake) * w);
  offset(st, a.head, 'rotation', 'y', c.yaw * .4 * e * w);
  a.arms.forEach((arm, i) => {
    const s = i ? 1 : -1;
    offset(st, arm, 'rotation', 'x', mixv(c.arm, A.arm) * w);
    offset(st, arm, 'rotation', 'z', -s * mixv(c.spread, A.spread) * w);
  });
  a.stoneWings.forEach(wing => {
    const s = wing.userData.side || 1;
    offset(st, wing, 'rotation', 'y', -s * mixv(c.wingY, A.wingY) * w);
    offset(st, wing, 'rotation', 'z', -s * mixv(c.wingZ, A.wingZ) * w);
  });
  return st;
}
