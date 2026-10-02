// The thrower's side of a thrown or fired object. flights.js flies the object from the cell
// behind its first drawn cell; this module finds who stands there and gives them a short
// 'throw' action whose release lands on the moment the object leaves. The fx timeline is
// delayed by the windup (delayTimeline in fx.js), as a hero zap is, so the object leaves the
// hand instead of appearing ahead of it.
//
//   hurl:  arm up and back over the shoulder, whip it forward over the top, follow through
//          low, with the body leaning into it (daggers, spears, stones, potions, anything).
//   shoot: arrows and crossbow bolts are loosed from a launcher: the arm comes up level to
//          aim, jolts back a little at the release, then lowers.
//   A centaur plays its own bow draw (centaur-attack.js), re-timed so the loose is the release.
//   An arm with an elbow (the hero's) bends it too, through swing.js's layer: a hurl folds the
//   forearm back behind the head in the windup and whips it straight just after the shoulder
//   comes over; a shot straightens the arm to aim and gives a little at the release.
//   The off arm (a shieldArm: the hero's, a soldier's) counter-swings a hurl: it swings out
//   wide for balance in the windup, then pulls in across the body as the throwing arm comes over.
//
// Nothing here looks at what the object is beyond flights.js's shape, which never reveals
// identity. The pose is offsets from rest for the action layer; every part is 0 at u = 0 and 1.

import {flightsFromFx} from './flights.js';
import {centaurAttackPose} from './centaur-attack.js';

export const THROW_TIME = .4;
// Where in the action the object leaves the hand, and so how long the windup is.
export const RELEASE_U = .35;
export const THROW_WINDUP_MS = Math.round(THROW_TIME * RELEASE_U * 1000);
// The most a throw waits for its thrower to finish something else first (ms).
export const MAX_THROW_LEAD_MS = 450;
// A multishot volley gets one throw per missile, up to this many.
export const MAX_THROWS = 3;
// Where the loose falls in centaur-attack.js's bow draw.
const CENTAUR_LOOSE_U = .48;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Smoothstepped value between keyframes [[u, ...values]], sorted by u, first at 0, last at 1.
function keys(list, u) {
  u = clamp01(u);
  let i = 1;
  while (i < list.length - 1 && list[i][0] < u) i++;
  const a = list[i - 1], b = list[i], t = smooth((u - a[0]) / (b[0] - a[0] || 1));
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t);
}

// [u, shoulder (negative raises forward), wrist, body pitch (forward is positive)].
const HURL = [[0, 0, 0, 0], [.24, -2.6, -.5, -.12], [RELEASE_U, -1.35, .35, .1], [.55, -.55, .2, .16], [1, 0, 0, 0]];
const SHOOT = [[0, 0, 0, 0], [.24, -1.45, 0, -.02], [RELEASE_U, -1.45, 0, -.02], [.45, -1.2, .1, -.06], [.7, -1.1, 0, 0], [1, 0, 0, 0]];

// [u, elbow] added to the rest bend (swing.js: negative bends, positive straightens). The hurl's
// elbow stays folded a beat after the shoulder starts forward, so the forearm whips.
const HURL_ELBOW = [[0, 0], [.24, -.85], [.29, -.8], [RELEASE_U, .5], [.55, .3], [1, 0]];
const SHOOT_ELBOW = [[0, 0], [.24, .55], [RELEASE_U, .55], [.45, .35], [.7, .3], [1, 0]];
// [u, off-arm roll] (swing.js's `shield`: shieldArm.rotation.z, negative swings out wide,
// positive tucks in across the body). A shot keeps the off arm still.
const HURL_OFF = [[0, 0], [.24, -.5], [.29, -.5], [RELEASE_U, .05], [.55, .22], [1, 0]];

// swing.js's offsets with only the elbow and off arm set; a rig without them ignores them.
const throwSwing = (elbow, shield) => ({arm: 0, armZ: 0, elbow, wrist: 0, socket: 0, shield, twist: 0, lean: 0});

export const throwStyle = shape => shape === 'arrow' || shape === 'bolt' ? 'shoot' : 'hurl';

// Offsets for a throw at u (0..1): {arm, wrist, pitch, swing} for most actors (swing holds the
// elbow and off-arm roll, for actions.js to hand to applySwing); a centaur's bow draw
// adds its `off`/`offGrip` (and a centaur spear or club thrower hurls like anyone else).
export function throwPose(style, u, centaur = null) {
  if (centaur === 'bow' && style === 'shoot') {
    // Map the release onto the bow's loose, before and after.
    const v = u <= RELEASE_U ? CENTAUR_LOOSE_U * u / RELEASE_U
      : CENTAUR_LOOSE_U + (1 - CENTAUR_LOOSE_U) * (u - RELEASE_U) / (1 - RELEASE_U);
    const b = centaurAttackPose('bow', v);
    return {arm: b.arm, off: b.off, offGrip: b.offGrip, wrist: 0, pitch: 0};
  }
  const shoot = style === 'shoot';
  const [arm, wrist, pitch] = keys(shoot ? SHOOT : HURL, u);
  const [elbow] = keys(shoot ? SHOOT_ELBOW : HURL_ELBOW, u);
  const shield = shoot ? 0 : keys(HURL_OFF, u)[0];
  return {arm, wrist, pitch, swing: throwSwing(elbow, shield)};
}

// Launches in a replayed fx timeline: [{x, z, dir, at, style, shape}], one per flight (earliest first,
// at most MAX_THROWS from the same cell). x, z is the thrower's map cell; dir the first step.
export function throwLaunches(timeline) {
  const out = [], perCell = new Map();
  const flights = flightsFromFx(timeline).sort((a, b) => a.start - b.start);
  for (const f of flights) {
    const [a, b] = f.knots;
    if (!b || (a.x === b.x && a.z === b.z)) continue;
    const key = `${a.x},${a.z}`, n = perCell.get(key) ?? 0;
    if (n >= MAX_THROWS) continue;
    perCell.set(key, n + 1);
    out.push({x: a.x, z: a.z, dir: [Math.sign(b.x - a.x), Math.sign(b.z - a.z)], at: f.start, style: throwStyle(f.shape), shape: f.shape});
  }
  return out;
}

// The action to queue on a thrower. The shape lets a held sling whirl for a stone (sling-whirl.js).
export const throwAction = launch => ({kind: 'throw', dir: launch.dir, style: launch.style, shape: launch.shape});
