// Prayer, the kneeling hero. While the god is deciding (see prayer-light.js) the hero kneels on both
// knees, calm and devout: the legs fold back under, the body lowers until the knees meet the floor, the
// back stays nearly straight with only a slight bow, both hands draw in and meet at the chest, and the
// head bows. The hold is still, only one slow breath moving through it and the head settling a touch
// lower. Then the hero rises, unhurried, and stands as before. (It used to be a fearful crouch, with a
// shiver, a peek at the sky, a flinch and a wary glance back; the user wanted it devout instead.)
//
// The arm and torso offsets are swing.js offsets on the hero rig, taken back off each frame
// before the new one is added, so they layer on whatever actions.js posed; the head tilt is
// tracked the same way. The legs and the body's height are written fresh by the render loop
// every frame (the walk cycle, the idle bob), so the kneel just adds its fold and drop on top
// and never takes them back. All offsets are exactly at rest at both ends. Any real action or a
// death takes over at once.

import {applySwing, clearSwing} from './swing.js';

export const KNEEL_TIME = 3.4;
const SWING_FIELDS = ['arm', 'armZ', 'elbow', 'wrist', 'socket', 'shield', 'twist', 'lean', 'offArm', 'offElbow'];
// head: tracked tilt (positive sinks the face). leg: both legs fold back by this (radians).
// drop: how far the body sinks, so the knees of a .47 leg folded by `leg` rest on the floor.
const FIELDS = [...SWING_FIELDS, 'head', 'leg', 'drop'];
const REST = Object.fromEntries(FIELDS.map(f => [f, 0]));
export const LEG_FOLD = 1.15, BODY_DROP = .28;
const KNELT = {arm: -.75, armZ: -.25, elbow: -.7, wrist: .2, socket: -.25, shield: -.2, twist: 0, lean: .12, offArm: -.7, offElbow: -.65,
  head: .42, leg: LEG_FOLD, drop: BODY_DROP};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const kneelMessage = text => typeof text === 'string' && /^You begin praying to /.test(text);

// Offsets at normalised time u: a measured kneel (the first fifth), a still hold with a slow breath and the
// head settling a little lower, then an unhurried rise (the last fifth).
export function kneelPose(u) {
  u = clamp01(Number.isFinite(u) ? u : 1);
  const hold = smooth(u / .2) * (1 - smooth((u - .8) / .2));
  const p = {...REST};
  for (const f of FIELDS) p[f] = KNELT[f] * hold;
  p.lean += .025 * Math.sin(Math.PI * clamp01((u - .2) / .6)) * hold;
  p.head += .08 * smooth((u - .25) / .4) * hold;
  return p;
}

// The tracked part of a pose (swing fields and the head), added to or taken off the rig.
function applyTracked(actor, p, sign) {
  const s = {};
  for (const f of SWING_FIELDS) s[f] = sign * p[f];
  applySwing(actor, s);
  if (actor.head) actor.head.rotation.x += sign * p.head;
}
// The untracked part: the legs fold and the body drops, on top of what the loop wrote this frame.
function applyFresh(actor, p) {
  if (actor.legs) for (const leg of actor.legs) leg.rotation.x += p.leg;
  if (actor.body) actor.body.position.y -= p.drop;
}

export function createPrayerKneel() {
  let age = null, applied = null;
  return {
    // Call with each engine message; true when it started a kneel.
    message(text) { if (!kneelMessage(text)) return false; age = 0; return true; },
    update(actor, dt, busy = false) {
      if (applied) { applyTracked(actor, applied, -1); applied = null; }
      if (age === null) return null;
      if (busy || !actor?.arm) { age = null; return null; }
      age += Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
      if (age >= KNEEL_TIME) { age = null; return null; }
      applied = kneelPose(age / KNEEL_TIME);
      applyTracked(actor, applied, 1);
      applyFresh(actor, applied);
      return applied;
    },
    clear(actor) { if (applied) applyTracked(actor, applied, -1); applied = null; age = null; },
    get playing() { return age !== null; },
  };
}
