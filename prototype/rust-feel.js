// The rust monsters' feelers (creature animation queue item 7). Rust monsters and disenchanters
// (rustMonster() in creatures.js) hunt by touch and smell, so their two long antennae never rest.
//  - At rest each feeler quests on its own: it holds an angle, then jerks to a new one, like an
//    insect's (a rust monster's jerks are quick and stuttering; a disenchanter's glide). A fine
//    quiver runs through both. The tail vane ticks round in jerks (a disenchanter's turns slowly).
//  - Within RANGE tiles of the hero both feelers swing round and point at them, drawing together
//    and quivering harder the closer the hero is, the head turns to follow, and the vane spins up
//    into a whirr. It smells the metal.
//  - Now and then it tastes the floor: both feelers dip to the flagstones ahead and tap, left,
//    right, left, right, the head bowed after them.
//  - Walking, the feelers sweep low ahead, reading the trail.
//  - When it attacks the feelers rear back and spread, then lash forward and cross over the
//    target (the rust touch), the head lunging behind them and the vane whirring.
//  - A blow makes the feelers flinch back and splay, and they creep forward again.
//  - On death everything eases back to rest, and the vane settles on a blade-symmetric angle.
//
// The module owns the feelers' rotation, the head's rotation and the vane's roll (all written
// absolutely from the rest pose every frame; live.js rolls the whole tail on top). No extra draws
// beyond the feelers' own groups (the disintegrator adds one mote cloud, crumble-motes.js).
import {updateCrumbleMotes} from './crumble-motes.js';

const TAU = Math.PI * 2;
// Hero sensing: range (tiles), the feelers' and head's turn limits (rad) and the head's turn rate.
export const RANGE = 6, AIM_YAW = .65, HEAD_YAW = .45, HEAD_RATE = 3;
// Questing: how far a feeler wanders from rest (pitch, yaw, splay; rad).
export const QUEST = {x: .32, y: .4, z: .22};
// Tasting the floor: idle ones first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart;
// TASTE_LEN s long. DIP rad of feeler pitch down to the floor, TAP rad per tap, BOW rad of head.
export const FIRST_MIN = 2.5, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 5, TASTE_LEN = 1.6, DIP = .8, TAP = .22, BOW = .16;
// The attack: rear back and spread, then lash forward and cross.
export const REAR = -.55, REAR_SPREAD = .35, LASH = 1.15, CROSS = .3, LUNGE = .22;
// A blow: the flinch back and splay, and how fast it creeps forward again (1/s).
export const FLINCH = -.65, FLINCH_SPREAD = .4, FLINCH_DECAY = 3.2;
// Walking: the feelers sweep low ahead.
export const WALK_DIP = .3;
// The feelers' pitch never passes MAX_PITCH, so the tip knobs stop at the floor.
export const MAX_PITCH = 1.25;
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// Per kind: questing jerk rate (1/s) and the gap between jerks (s); quiver Hz and amplitude (rad,
// at rest and fully excited); the vane's ticks (rad per tick, gap s) and its whirr (rad/s).
export const LOOKS = {
  'rust monster': {jerk: 16, gap: .2, gapSpan: .65, qHz: 15, quiver: .018, quiverNear: .07, tick: Math.PI / 3, tickGap: .5, tickSpan: 1, whirr: 15, drift: 0},
  disenchanter: {jerk: 3.2, gap: .8, gapSpan: 1.4, qHz: 9, quiver: .01, quiverNear: .045, tick: 0, tickGap: 1, tickSpan: 1, whirr: 9, drift: .7},
  // The disintegrator: slower still, a long patient glide between holds, a faint low quiver, and its
  // vane turning slowly round; it doesn't need to hurry. Its rump sheds motes (crumble-motes.js).
  disintegrator: {jerk: 2.2, gap: 1.1, gapSpan: 1.8, qHz: 6, quiver: .007, quiverNear: .05, tick: 0, tickGap: 1, tickSpan: 1, whirr: 6, drift: .35},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const pulse = (v, at, len) => v > at && v < at + len ? Math.sin((v - at) / len * Math.PI) : 0;

export const feels = a => !!(a && !a.asset && a.rustFeel && a.feelHead && a.vane && Array.isArray(a.feelers) && a.feelers.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The taste at progress u (0..1): {dip, taps: [left, right]} (0..1). The feelers drop (to .2),
// tap left, right, left, right, and rise again (from .8).
export function tastePose(u) {
  if (!(u > 0) || !(u < 1)) return {dip: 0, taps: [0, 0]};
  const dip = smooth(u / .2) * (1 - smooth((u - .8) / .2));
  return {dip, taps: [pulse(u, .22, .12) + pulse(u, .5, .12), pulse(u, .36, .12) + pulse(u, .64, .12)]};
}

// The attack at action phase u (0..1): {rear, lash} (0..1).
export function lashPose(u) {
  if (!(u > 0) || !(u < 1)) return {rear: 0, lash: 0};
  return {rear: smooth(u / .3) * (1 - smooth((u - .3) / .08)), lash: smooth((u - .33) / .1) * (1 - smooth((u - .6) / .4))};
}

const rot = o => ({x: o.rotation.x, y: o.rotation.y, z: o.rotation.z});
function setup(a) {
  const st = {seed: ((a.g?.id ?? 1) * 69621) % 2147483647 || 1, life: 1, look: LOOKS[a.rustFeel] || LOOKS['rust monster'],
    feelers: a.feelers.map(f => ({rest: rot(f), at: {x: 0, y: 0, z: 0}, to: {x: 0, y: 0, z: 0}, wait: 0})),
    head: rot(a.feelHead), vaneRest: a.vane.rotation.z, spin: 0, spinTo: 0, tickWait: 0,
    aim: 0, near: 0, taste: null, wait: 0, flinch: 0, lastHit: null, T: 0};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  st.tickWait = st.look.tickGap + st.look.tickSpan * rand(st);
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

// Call once a frame (fidget.js does). `busy` holds off an idle taste while it moves or acts;
// `walking` lowers the feelers; `look` is the hero's position (same parent as actor.g), or null.
export function updateRustFeel(a, dt, t, busy, look = null, walking = false) {
  if (!feels(a)) return null;
  const st = a.rustFeel_ || (a.rustFeel_ = setup(a));
  const L = st.look, dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  const T = st.T, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // the hero: aim at them and get excited, the nearer the more
  const h = dead ? null : sense(a, look);
  st.near = approach(st.near, h ? 1 - h.d / RANGE * .7 : 0, 4, dt);
  st.aim = approach(st.aim, h ? h.b : 0, HEAD_RATE, dt);
  const ex = st.near;

  // a blow: flinch, then creep forward again
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.flinch = 1; st.taste = null; }
  st.flinch *= Math.exp(-FLINCH_DECAY * dt);
  if (st.flinch < SNAP) st.flinch = 0;
  const fl = st.flinch;

  // the attack
  const atk = dead ? null : current(a, 'attack');
  if (atk) st.taste = null;
  const lp = atk ? lashPose(a.actions.u ?? 0) : {rear: 0, lash: 0};

  // tasting the floor, on its own clock while it stands still
  if (st.taste != null) { st.taste += dt / TASTE_LEN; if (st.taste >= 1) st.taste = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0 && !busy) { st.taste = 0; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const tp = tastePose(st.taste ?? 0);

  // questing: each feeler holds an angle, then jerks (or glides) to a new one; less while it aims
  const calm = (1 - .7 * ex) * (1 - tp.dip) * (1 - Math.max(lp.rear, lp.lash));
  for (const f of st.feelers) {
    f.wait -= dt;
    if (f.wait <= 0 && !dead) {
      f.to = {x: (rand(st) * 2 - 1) * QUEST.x, y: (rand(st) * 2 - 1) * QUEST.y, z: (rand(st) * 2 - 1) * QUEST.z};
      f.wait = L.gap + L.gapSpan * rand(st);
    }
    for (const k of ['x', 'y', 'z']) f.at[k] = approach(f.at[k], f.to[k], L.jerk, dt);
  }

  const aimYaw = clamp(st.aim, AIM_YAW) * ex, qAmp = L.quiver + (L.quiverNear - L.quiver) * ex;
  a.feelers.forEach((obj, i) => {
    const f = st.feelers[i], r = f.rest, s = i ? 1 : -1;
    const qv = Math.sin(T * L.qHz * TAU + i * 1.3 + ph) * qAmp, qv2 = Math.sin(T * L.qHz * 1.37 * TAU + i * 2.1) * qAmp * .6;
    // pitch: + is tip forward and down; splay: s * spread opens the pair outward
    let x = f.at.x * calm + .35 * ex + DIP * tp.dip + TAP * tp.taps[i] + (walking ? WALK_DIP : 0) * (1 - tp.dip)
      + REAR * lp.rear + LASH * lp.lash + FLINCH * fl;
    x = Math.min(x, MAX_PITCH) + qv;
    const spread = -.12 * ex + REAR_SPREAD * lp.rear - CROSS * lp.lash + FLINCH_SPREAD * fl;
    const y = f.at.y * calm + aimYaw + qv2;
    const z = f.at.z * calm - s * spread + qv2 * .5;
    obj.rotation.x = r.x + x * w;
    obj.rotation.y = r.y + y * w;
    obj.rotation.z = r.z + z * w;
  });

  // the head: turns after the hero, bows to taste, lunges into the lash, jerks back from a blow
  const hd = a.feelHead, hr = st.head;
  hd.rotation.x = hr.x + (BOW * tp.dip - .1 * lp.rear + LUNGE * lp.lash - .2 * fl + .02 * Math.sin(T * 1.1 + ph)) * w;
  hd.rotation.y = hr.y + (clamp(st.aim, HEAD_YAW) * ex + .05 * Math.sin(T * .6 + ph)) * w;
  hd.rotation.z = hr.z + (.06 * (tp.taps[0] - tp.taps[1]) + .04 * fl * Math.sin(T * 37)) * w;

  // the vane: ticks round in jerks at rest, whirrs when it smells metal or strikes
  if (!dead) {
    st.spinTo += (L.drift + L.whirr * Math.max(ex * ex, lp.lash, lp.rear * .5)) * dt;
    if (L.tick) { st.tickWait -= dt; if (st.tickWait <= 0) { st.spinTo += L.tick; st.tickWait = L.tickGap + L.tickSpan * rand(st) * (1 - .8 * ex); } }
  } else {
    // settle on a blade-symmetric angle (the vane has two opposite blades)
    st.spinTo = Math.round(st.spin / Math.PI) * Math.PI;
  }
  st.spin = approach(st.spin, st.spinTo, 18, dt);
  if (st.spinTo > 1e4) { const k = Math.floor(st.spinTo / TAU) * TAU; st.spinTo -= k; st.spin -= k; }
  if (dead && w === 0) { st.spin = st.spinTo; }
  a.vane.rotation.z = st.vaneRest + st.spin;
  updateCrumbleMotes(a, dt, T, ex, lp.lash, hit, dead, w);
  return st;
}
