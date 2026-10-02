import * as THREE from 'three';

// The skeletal hand clawing up out of a risen grave (grave.js: userData.hand pivots at the
// wrist just under the soil, userData.claw at the knuckles) is dead still most of the time.
// Every few seconds it does something, picked per grave and per slot:
//  - spasm: the fingers jerk open, snap back past rest, jerk again and settle;
//  - grasp: the arm strains up and out of the hollow while the fingers slowly splay wide,
//    then the claw snaps shut hard and holds, and the whole thing sinks back;
//  - drum: three quick, impatient taps of the fingers;
//  - feel: the hand turns slowly one way then the other, fingers flexing, as if feeling
//    for the edge of the hollow.
// The motion is keyframed with fast moves and holds so it reads jerky and wrong rather than
// soft. Tilts stay under HAND_TILT so the forearm's stump never shows at the hollow's rim.
// The scene is re-scanned twice a second; everything is a function of t, so it's frame-rate
// independent. A grave is terrain, not an item, so nothing here gives anything away.

export const HAND_SCAN_EVERY = .5; // seconds between scene scans
export const HAND_SLOT = 7; // seconds per slot; at most one move per slot
export const HAND_CHANCE = .65; // chance a slot has a move in it
export const HAND_TILT = .2; // largest wrist tilt (rad); grave.js says keep under about .3
export const CLAW_RANGE = [-.6, .2]; // claw rotation.x: negative splays, positive clenches

// Keys are [time, claw x, hand x, hand z]. Hand x tilts the forearm out toward +z (the way
// the palm faces); hand z leans it sideways.
export const MOVES = {
  spasm: [[0, 0, 0, 0], [.06, -.38, .05, 0], [.16, -.38, .05, 0], [.22, .14, -.02, 0], [.34, -.22, .03, .02], [.4, -.22, .03, .02], [.5, .08, 0, 0], [.9, 0, 0, 0]],
  grasp: [[0, 0, 0, 0], [1.1, -.55, .14, .05], [1.35, -.6, .17, .07], [1.45, .18, .08, -.03], [2.1, .16, .07, -.03], [3.2, 0, 0, 0]],
  drum: [[0, 0, 0, 0], [.1, -.2, .02, 0], [.17, .1, 0, 0], [.32, .1, 0, 0], [.42, -.2, .02, 0], [.49, .1, 0, 0], [.64, .1, 0, 0], [.74, -.2, .02, 0], [.81, .1, 0, 0], [1.6, 0, 0, 0]],
  feel: [[0, 0, 0, 0], [.8, -.16, .06, .17], [1.0, -.08, .06, .17], [1.8, -.18, .05, -.17], [2.0, -.1, .05, -.17], [2.8, 0, 0, 0]],
};
const KINDS = ['spasm', 'spasm', 'grasp', 'drum', 'feel'];

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const smooth = u => u * u * (3 - 2 * u);

// Sample a move's keys at u seconds into it.
export function sampleMove(keys, u) {
  if (u <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (u <= b[0]) {
      const k = smooth((u - a[0]) / (b[0] - a[0]));
      return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
    }
  }
  return keys[keys.length - 1].slice(1);
}

// The move (if any) in a given slot of a grave with this phase: {kind, start, keys}.
export function slotMove(slot, phase = 0) {
  const h = k => hash(slot * 7.31 + k * 1.93 + phase * 101.7);
  if (h(1) >= HAND_CHANCE) return null;
  const kind = KINDS[Math.floor(h(2) * KINDS.length)], keys = MOVES[kind];
  const dur = keys[keys.length - 1][0];
  // Mirror sideways leans half the time, so the hand doesn't always feel the same way.
  const side = h(3) < .5 ? -1 : 1;
  return {kind, start: slot * HAND_SLOT + h(4) * (HAND_SLOT - dur), keys: side < 0 ? keys.map(([t, c, x, z]) => [t, c, x, -z]) : keys};
}

// Pose at time t: {claw, x, z, kind}; all zero (rest) between moves.
export function handPose(t, phase = 0) {
  const slot = Math.floor(t / HAND_SLOT), m = slotMove(slot, phase);
  if (m) {
    const u = t - m.start, dur = m.keys[m.keys.length - 1][0];
    if (u >= 0 && u <= dur) {
      const [claw, x, z] = sampleMove(m.keys, u);
      return {claw, x, z, kind: m.kind};
    }
  }
  return {claw: 0, x: 0, z: 0, kind: null};
}

const e = new THREE.Euler(), q = new THREE.Quaternion();
export function poseHand(grave, t) {
  const {hand, claw} = grave.userData;
  const p = handPose(t, grave.userData.handPhase ?? 0);
  hand.quaternion.copy(hand.userData.rest.quaternion).multiply(q.setFromEuler(e.set(p.x, 0, p.z)));
  claw.quaternion.copy(claw.userData.rest.quaternion).multiply(q.setFromEuler(e.set(p.claw, 0, 0)));
  return p;
}

function phaseOf(obj) {
  const x = Math.sin(obj.id * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
}

export function findRisenGraves(scene) {
  const out = [];
  scene.traverse(o => { if (o.name === 'Grave' && o.userData.hand && o.userData.claw) out.push(o); });
  return out;
}

export function createGraveHands(scene) {
  let graves = [], nextScan = -Infinity;
  return {
    get graves() { return graves; },
    update(t) {
      if (t >= nextScan || t < nextScan - HAND_SCAN_EVERY * 2) {
        graves = findRisenGraves(scene);
        for (const g of graves) g.userData.handPhase ??= phaseOf(g);
        nextScan = t + HAND_SCAN_EVERY;
      }
      for (const g of graves) if (g.visible) poseHand(g, t);
    },
  };
}
