// Digging flavor, step two: the tool swings with weight. Each "You hit the rock with all your
// might." (see dig-chips.js) sends the hero's tool up over the shoulder, holds it a beat at the
// top as if it were heavy, then drops it hard and lets the jolt run back up the arm: the torso
// slams forward and the wrist judders. Blows that land while one is still playing restart it
// from the top, so a long dig reads as a steady grim chopping.
//
// Poses are swing.js offsets on the hero rig, taken back off each frame before the new one is
// added, so it layers on whatever the walk cycle and actions.js posed. They return exactly to
// rest at the end of the blow. A real melee swing or a death takes over at once.

import {applySwing, clearSwing} from './swing.js';

export const DIG_TIME = .85;
// Normalised time the tool bites, and how far into the blow the hang at the top lasts.
export const BITE_U = .52, HANG_U = .34;
const FIELDS = ['arm', 'armZ', 'elbow', 'wrist', 'socket', 'shield', 'twist', 'lean', 'offArm', 'offElbow'];
const REST = Object.fromEntries(FIELDS.map(f => [f, 0]));
const TOP = {arm: -2.9, armZ: .3, elbow: -.45, wrist: -.5, socket: .45, shield: .22, twist: .2, lean: -.16, offArm: -.55, offElbow: .4};
const BITE = {arm: -1.0, armZ: -.05, elbow: .4, wrist: .4, socket: -1.1, shield: .05, twist: -.12, lean: .26, offArm: .35, offElbow: -.2};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const digMessage = text => typeof text === 'string' && /^You hit the .+ with all your might\.$/.test(text);

// Offsets at normalised time u: a slow haul to the top, a hang with a faint quiver, a fast
// accelerating drop to the bite (the free hand hauls up with it and flings back as a counterweight), then a recoil that shudders and settles back to rest.
export function digSwingPose(u) {
  u = clamp01(Number.isFinite(u) ? u : 1);
  const p = {...REST};
  const mix = (a, b, k) => { for (const f of FIELDS) p[f] = a[f] + (b[f] - a[f]) * k; };
  if (u < HANG_U) mix(REST, TOP, smooth(u / HANG_U));
  else if (u < BITE_U) {
    const k = clamp01((u - HANG_U) / (BITE_U - HANG_U));
    mix(TOP, BITE, k * k * k);
    // the top hangs a moment: the held weight trembles before it falls
    p.arm += .05 * Math.sin(k * 14) * (1 - k);
  } else {
    const k = clamp01((u - BITE_U) / (1 - BITE_U));
    mix(BITE, REST, smooth(k));
    // the jolt of the strike runs back up the arm and dies away; the free hand flings back for balance
    p.offArm -= .12 * Math.sin(k * Math.PI) * (1 - k);
    const jolt = Math.sin(k * Math.PI * 5) * Math.pow(1 - k, 2);
    p.wrist += .22 * jolt; p.elbow -= .1 * jolt; p.lean += .04 * jolt;
  }
  return p;
}

// The strike that finishes the job (pit, hole or breach, as dig-chips.js reads them).
export const finishMessage = text => typeof text === 'string' &&
  /^You dig a pit in the |^You dig a hole through the |^You succeed in cutting away some rock\.$|^You make an opening in the wall\.$/.test(text);

// After the last strike the hero is spent: the tool drags at the end of a slack arm, the
// shoulders sag and heave twice, then one sharp involuntary jerk as if the rock had twitched
// back, and a slow recovery. Offsets like digSwingPose, exactly at rest at both ends.
export const SPENT_TIME = 1.5;
const SPENT = {arm: .45, armZ: .1, elbow: .25, wrist: .3, socket: -.2, shield: .1, twist: .08, lean: .3, offArm: 0, offElbow: 0};
export function spentPose(u) {
  u = clamp01(Number.isFinite(u) ? u : 1);
  const p = {...REST};
  const sag = smooth(u / .2) * (1 - smooth((u - .78) / .22));
  for (const f of FIELDS) p[f] = SPENT[f] * sag + 0;
  // two tired heaves of the shoulders while it hangs
  const heave = Math.sin(clamp01((u - .15) / .55) * Math.PI * 4) * sag * .05;
  p.lean += heave; p.arm += heave * .6;
  // the tic: a quick snap of the twist and wrist, gone in a blink
  const tic = clamp01((u - .6) / .08) * (1 - clamp01((u - .68) / .1)), k = Math.sin(tic * Math.PI);
  p.twist -= .35 * k; p.wrist -= .25 * k;
  return p;
}

export function createDigSwing() {
  let age = null, applied = null, spent = false;
  return {
    // Call with each engine message; true when it started (or restarted) a blow or the spent slump.
    message(text) {
      if (digMessage(text)) { age = 0; spent = false; return true; }
      if (finishMessage(text)) { age = 0; spent = true; return true; }
      return false;
    },
    // Each frame, after actions.js: take back last frame's offset, then add this frame's.
    update(actor, dt, busy = false) {
      if (applied) { clearSwing(actor, applied); applied = null; }
      if (age === null) return null;
      if (busy || !actor?.arm) { age = null; return null; }
      age += Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
      if (age >= (spent ? SPENT_TIME : DIG_TIME)) { age = null; return null; }
      applied = spent ? spentPose(age / SPENT_TIME) : digSwingPose(age / DIG_TIME);
      applySwing(actor, applied);
      return applied;
    },
    clear(actor) { if (applied) clearSwing(actor, applied); applied = null; age = null; spent = false; },
    get playing() { return age !== null; },
  };
}
