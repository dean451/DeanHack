// Cockatrices and chickatrices (creature animation queue item 6). Before this they only had the
// generic leg shuffle and a dog's tail wag. In NetHack a cockatrice is the thing you never touch
// barehanded: its hiss and its bite turn you to stone. So it gets a wrong, jerky bird's menace:
//  - Its head never glides. It holds dead still, then snaps to a new angle in a few hundredths of a
//    second, like a hen's, and holds again. Within WATCH_RANGE tiles of the hero almost every snap
//    lands on them, so it keeps jerking back to stare at you. Walking, the head pumps fore and aft.
//  - Now and then, standing still, it hisses: it crouches, thrusts its head out low toward you,
//    throws both wings up and out (mantled) and fans its tail plumes up, the head trembling, then
//    slowly folds back, the head giving two sharp sideways flicks as it goes, like shaking off a
//    bad taste. It hisses more often while the hero is near.
//  - A grey, stony shimmer hangs at the beak: a few faint glinting motes that drift off it at rest
//    and swell into a cloud of grey grit while it hisses. The pyrolisk (same model, a fire gaze,
//    no stoning) gets embers instead.
//  - On death everything eases back to rest and the shimmer dies out.
//
// Writes (all as offsets taken back first thing each frame, so nothing drifts): the head's
// rotation (y, x) and position (y, z), each wing's rotation (y, z), the body's rotation.x and the
// tail's rotation.x. Adds one point layer on the head (one draw per cockatrice). Only cockatrices
// built by creatures.js cockatrice() have the `head` and `wingParts` handles.
import * as THREE from 'three';
import {makePointLayer, rng} from './fx-points.js';

// Head jerks: a snap takes SNAP_S, then holds HOLD_MIN..+HOLD_SPAN s. Idle looks reach JERK_YAW
// and JERK_PITCH (negative looks up); near the hero, WATCH of the snaps land on it, give or take
// AIM_JITTER. WATCH_RANGE: tiles it watches from; YAW_MAX/PITCH_MAX clamp any look.
export const SNAP_S = .06, HOLD_MIN = .3, HOLD_SPAN = 1.1, JERK_YAW = .55, JERK_PITCH = .22, WATCH = .8, AIM_JITTER = .12;
export const WATCH_RANGE = 5, YAW_MAX = .9, PITCH_MAX = .35;
// Walking head pump: how far (local units) and the stride rate (rad/s, matching live.js's legs).
export const PUMP = .03, PUMP_RATE = 11;
// The hiss: rise over RISE_S, hold HISS_S, fold back over FALL_S. Wings lift WING_LIFT and fan
// WING_FAN; the body crouches CROUCH (pitches forward); the head drops HEAD_DROP and juts HEAD_JUT
// (local units) and tips down HEAD_DIP; the tail plumes rise TAIL_UP; the head trembles TREMBLE
// at TREMBLE_HZ, and the wings shiver SHIVER.
export const RISE_S = .22, HISS_S = 1.2, FALL_S = .7;
export const WING_LIFT = .95, WING_FAN = .4, CROUCH = .14, HEAD_DROP = .035, HEAD_JUT = .06, HEAD_DIP = .18, TAIL_UP = .45;
// Aftershake: while the hiss folds back the head flicks side to side, FLICK_AMP rad, FLICK_COUNT
// flicks, dying away to nothing as the fold ends.
export const FLICK_AMP = .05, FLICK_COUNT = 2;
export const TREMBLE = .045, TREMBLE_HZ = 24, SHIVER = .06;
// First hiss after FIRST_MIN..+FIRST_SPAN s still, then GAP_MIN..+GAP_SPAN apart (× NEAR_GAP with
// the hero in range). BREAK_RATE: how fast walking, an action or death cuts one short (1/s);
// REST_RATE: how fast it all settles on death.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 5, NEAR_GAP = .55, BREAK_RATE = 8, REST_RATE = 3;
// The shimmer: motes, their period (s), size, the resting share of their alpha and the hiss boost.
export const MOTES = 10, MOTE_PERIOD = 1.6, MOTE_SIZE = .028, IDLE_GLOW = .3, HISS_GLOW = 1;
export const LOOKS = {stone: {color: '#c9c6bb', alpha: .85}, ember: {color: '#ff8a2a', alpha: .9}};
// The beak tip in the head's frame (creatures.js: the beak cone sits at z .11, .12 long).
const BEAK = {x: 0, y: -.02, z: .17};
const SNAP = 1e-3;

const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const fin = (v, d = 0) => Number.isFinite(v) ? v : d;

export const hisses = a => !!(a && !a.asset && a.quirk === 'cockatrice' && a.head && Array.isArray(a.wingParts) && a.g);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

export const hissLength = () => RISE_S + HISS_S + FALL_S;
// How far into the hiss pose (0..1) s seconds in: a quick ease-out rise, a hold, a slower fold.
export function hissWeight(s) {
  s = fin(s, -1);
  if (s <= 0 || s >= hissLength()) return 0;
  if (s < RISE_S) { const u = s / RISE_S; return 1 - (1 - u) ** 3; }
  if (s < RISE_S + HISS_S) return 1;
  return 1 - smooth((s - RISE_S - HISS_S) / FALL_S);
}
// The head's sideways flick (rad) s seconds into the hiss: zero until the fold begins and zero again
// when it ends, a fading wobble of FLICK_COUNT flicks between.
export function aftershake(s) {
  s = fin(s, -1);
  const u = (s - RISE_S - HISS_S) / FALL_S;
  if (u <= 0 || u >= 1) return 0;
  return FLICK_AMP * Math.sin(2 * Math.PI * FLICK_COUNT * u) * (1 - u);
}
// A head snap's progress at u (0..1): almost all of it in the first half, then a tiny overshoot
// settling, so it reads as a jerk rather than a turn.
export function snapCurve(u) {
  u = fin(u, 1);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return 1 - (1 - u) ** 4 + .08 * Math.sin(Math.PI * u) * (1 - u);
}

// A mote at life p (0..1): it leaves the beak tip, drifts forward and sinks a little like falling
// grit, swelling and fading. `seed` is four randoms.
export function moteAt(seed, p) {
  const a = seed[0] * Math.PI * 2, r = .012 + .03 * seed[1] * p;
  const fade = Math.sin(Math.PI * clamp01(p));
  return {
    x: BEAK.x + Math.cos(a) * r,
    y: BEAK.y + Math.sin(a) * r * .7 - .04 * p * p * (.5 + seed[2]),
    z: BEAK.z + .05 * p * (.4 + seed[3]),
    alpha: fade * (.55 + .45 * Math.abs(Math.sin(p * 11 + seed[2] * 6))),
    size: .6 + .5 * p,
  };
}

// Where the hero is from this cockatrice: {yaw, pitch} relative to its heading, or null.
export function aimAt(actor, look) {
  const g = actor?.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > WATCH_RANGE) return null;
  return {yaw: wrap(Math.atan2(dx, dz) - g.rotation.y), pitch: -Math.atan2(.9, d) * .5};
}

function setup(a) {
  const st = {
    seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, wait: 0, hiss: null, f: 0, life: 1, pump: 0,
    from: {y: 0, x: 0}, to: {y: 0, x: 0}, s: 1, hold: 0,
    applied: {hy: 0, hx: 0, py: 0, pz: 0, body: 0, tail: 0, wings: a.wingParts.map(() => ({y: 0, z: 0}))},
  };
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.hold = rand(st) * HOLD_MIN;
  const look = LOOKS[a.species === 'pyrolisk' ? 'ember' : 'stone'];
  st.style = {color: look.color, blend: 'add', count: MOTES, size: MOTE_SIZE, period: MOTE_PERIOD, alpha: 0};
  st.base = look.alpha;
  st.layer = makePointLayer(st.style, rng(st.seed), moteAt);
  st.layer.points.name = 'cockatrice-shimmer';
  a.head.add(st.layer.points);
  return st;
}

function takeBack(a, st) {
  const o = st.applied, h = a.head;
  h.rotation.y -= o.hy; h.rotation.x -= o.hx; h.position.y -= o.py; h.position.z -= o.pz;
  if (a.body) a.body.rotation.x -= o.body;
  if (a.tail) a.tail.rotation.x -= o.tail;
  a.wingParts.forEach((w, i) => { w.rotation.y -= o.wings[i].y; w.rotation.z -= o.wings[i].z; o.wings[i].y = o.wings[i].z = 0; });
  o.hy = o.hx = o.py = o.pz = o.body = o.tail = 0;
}

// Call once per frame. `busy`: walking or an action playing or queued; `walking`: actually moving;
// `look`: the hero's position (same parent as actor.g) or null. Returns {hiss, glow, yaw, pitch}
// for tests, or null for anything but a cockatrice.
export function updateCockatriceHiss(a, dt, t, busy, walking = busy, look = null) {
  if (!hisses(a)) return null;
  const st = a.hissing || (a.hissing = setup(a));
  takeBack(a, st);
  dt = Math.max(0, fin(dt)); t = fin(t);
  const dead = !!a.actions?.dead;
  if (dead) st.life = Math.max(0, st.life - dt * REST_RATE);
  const aim = dead ? null : aimAt(a, look);

  // The hiss: picked while still, sooner with the hero near; cut short by walking, an action or death.
  const still = !busy && !dead;
  if (st.hiss) {
    st.hiss.s += dt;
    st.f = still ? Math.min(1, st.f + dt * BREAK_RATE) : Math.max(0, st.f - dt * BREAK_RATE);
    if (st.hiss.s >= hissLength() || st.f <= 0) { st.hiss = null; st.f = 0; st.wait = (GAP_MIN + GAP_SPAN * rand(st)) * (aim ? NEAR_GAP : 1); }
  } else if (still && (st.wait -= dt) <= 0) { st.hiss = {s: 0}; st.f = 1; }
  const life = st.life, hiss = (st.hiss ? hissWeight(st.hiss.s) * st.f : 0) * life;
  const holding = st.hiss && st.hiss.s > RISE_S && st.hiss.s < RISE_S + HISS_S ? st.f * life : 0;

  // Head jerks: hold, then snap to a new look (mostly at the hero when near; level while hissing).
  st.s += dt / SNAP_S;
  if ((st.hold -= dt) <= 0) {
    const cur = snapCurve(st.s);
    st.from = {y: st.from.y + (st.to.y - st.from.y) * cur, x: st.from.x + (st.to.x - st.from.x) * cur};
    if (dead) st.to = {y: 0, x: 0};
    else if (aim && rand(st) < WATCH) st.to = {y: clamp(aim.yaw + (rand(st) * 2 - 1) * AIM_JITTER, YAW_MAX), x: clamp(aim.pitch + (rand(st) * 2 - 1) * AIM_JITTER * .5, PITCH_MAX)};
    else st.to = {y: (rand(st) * 2 - 1) * JERK_YAW, x: clamp((rand(st) * 2 - .8) * JERK_PITCH, PITCH_MAX)};
    st.s = 0;
    st.hold = HOLD_MIN + HOLD_SPAN * rand(st);
  }
  const k = snapCurve(st.s);
  let yaw = st.from.y + (st.to.y - st.from.y) * k, pitch = st.from.x + (st.to.x - st.from.x) * k;
  // A hiss points the head straight at its target (the hero when near) and levels it.
  const hissYaw = aim ? clamp(aim.yaw, YAW_MAX) : yaw;
  yaw += (hissYaw - yaw) * hiss; pitch += (0 - pitch) * hiss;
  const tremble = TREMBLE * holding * Math.sin(t * TREMBLE_HZ);
  const pumpTo = walking && !dead ? 1 : 0;
  st.pump += (pumpTo - st.pump) * (1 - Math.exp(-6 * dt));
  const pump = PUMP * st.pump * Math.sin(t * PUMP_RATE) * life;

  const h = a.head, o = st.applied;
  const flick = st.hiss ? aftershake(st.hiss.s) * st.f : 0;
  o.hy = (yaw + tremble + flick) * life; o.hx = pitch * life + HEAD_DIP * hiss;
  o.py = -HEAD_DROP * hiss; o.pz = HEAD_JUT * hiss + pump;
  h.rotation.y += o.hy; h.rotation.x += o.hx; h.position.y += o.py; h.position.z += o.pz;
  if (a.body) { o.body = CROUCH * hiss; a.body.rotation.x += o.body; }
  if (a.tail) { o.tail = -TAIL_UP * hiss; a.tail.rotation.x += o.tail; }
  a.wingParts.forEach((w, i) => {
    const side = w.userData.side || (i ? 1 : -1);
    const flick = SHIVER * holding * Math.sin(t * TREMBLE_HZ * 1.3 + i * 2);
    const y = side * WING_FAN * hiss, z = side * (WING_LIFT * hiss + flick);
    w.rotation.y += y; w.rotation.z += z;
    o.wings[i] = {y, z};
  });

  // The shimmer at the beak: faint at rest, a cloud of grit while hissing; gone on death.
  const glow = (IDLE_GLOW + (HISS_GLOW - IDLE_GLOW) * hiss) * life;
  st.style.alpha = st.base * glow;
  st.layer.points.visible = glow > SNAP;
  if (st.layer.points.visible) st.layer.update(t);
  if (dead && life <= SNAP) { st.hiss = null; st.f = 0; }
  return {hiss, glow, yaw: o.hy, pitch: o.hx};
}
