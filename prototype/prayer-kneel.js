// Prayer, the kneeling hero. While the god is deciding (see prayer-light.js) the hero bows: the
// torso folds forward, both hands draw in to the chest and the head sinks. It is not devout
// so much as braced. A faint tremor runs through the held pose and, once, a small flinch, as if
// something had looked back. Then the hero straightens slowly, with no relief in it.
//
// Poses are swing.js offsets on the hero rig, taken back off each frame before the new one is
// added, so they layer on whatever actions.js posed. They are exactly at rest at both ends. Any
// real action or a death takes over at once.

import {applySwing, clearSwing} from './swing.js';

export const KNEEL_TIME = 3.4;
const FIELDS = ['arm', 'armZ', 'elbow', 'wrist', 'socket', 'shield', 'twist', 'lean', 'offArm', 'offElbow'];
const REST = Object.fromEntries(FIELDS.map(f => [f, 0]));
const BOWED = {arm: -.85, armZ: -.2, elbow: -.55, wrist: .25, socket: -.3, shield: -.15, twist: 0, lean: .42, offArm: -.8, offElbow: -.5};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const kneelMessage = text => typeof text === 'string' && /^You begin praying to /.test(text);

// Offsets at normalised time u: a quick fold down, a held bow that shivers, a sneaked look up that ducks back lower, one flinch at about
// two thirds, then a slow rise.
export function kneelPose(u) {
  u = clamp01(Number.isFinite(u) ? u : 1);
  const hold = smooth(u / .16) * (1 - smooth((u - .82) / .18));
  const p = {...REST};
  for (const f of FIELDS) p[f] = BOWED[f] * hold;
  // the shiver builds toward the flinch, as if something were drawing near
  p.lean += .015 * (1 + 1.5 * smooth((u - .35) / .25) * (1 - clamp01((u - .62) / .04))) * Math.sin(u * 60) * hold;
  const flinch = Math.sin(clamp01((u - .62) / .07) * Math.PI) * (1 - clamp01((u - .69) / .03)) * hold;
  p.lean -= .12 * flinch; p.twist += .1 * flinch;
  // Early in the hold the hero sneaks a look up, then ducks a little lower than before, as if
  // the sky had been looking too.
  const peek = Math.sin(clamp01((u - .28) / .08) * Math.PI) * hold, duck = smooth((u - .37) / .05) * (1 - smooth((u - .6) / .1)) * hold;
  p.lean += .05 * duck - .1 * peek; p.wrist -= .15 * peek; p.socket -= .06 * peek;
  // Rising, the hero flicks one wary glance over the shoulder, at whatever was behind the sky, before facing front again.
  p.twist -= .22 * Math.sin(clamp01((u - .86) / .1) * Math.PI);
  return p;
}

export function createPrayerKneel() {
  let age = null, applied = null;
  return {
    // Call with each engine message; true when it started a kneel.
    message(text) { if (!kneelMessage(text)) return false; age = 0; return true; },
    update(actor, dt, busy = false) {
      if (applied) { clearSwing(actor, applied); applied = null; }
      if (age === null) return null;
      if (busy || !actor?.arm) { age = null; return null; }
      age += Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
      if (age >= KNEEL_TIME) { age = null; return null; }
      applied = kneelPose(age / KNEEL_TIME);
      applySwing(actor, applied);
      return applied;
    },
    clear(actor) { if (applied) clearSwing(actor, applied); applied = null; age = null; },
    get playing() { return age !== null; },
  };
}
