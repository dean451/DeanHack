import * as THREE from 'three';

// The skeletal hand clawing up out of a risen grave (grave.js: userData.hand pivots at the
// wrist just under the soil, userData.claw at the knuckles) is dead still most of the time.
// Every few seconds it does something, picked per grave and per slot:
//  - spasm: the fingers jerk open, snap back past rest, jerk again and settle;
//  - grasp: the arm strains up and out of the hollow while the fingers slowly splay wide,
//    then the claw snaps shut hard and holds, and the whole thing sinks back;
//  - drum: three quick, impatient taps of the fingers;
//  - feel: the hand turns slowly one way then the other, fingers flexing, as if feeling
//    for the edge of the hollow;
//  - beckon: the fingers curl in slowly and crooked, three times, as if calling the hero
//    down, with the wrist swaying a little in time.
// The motion is keyframed with fast moves and holds so it reads jerky and wrong rather than
// soft. Tilts stay under HAND_TILT so the forearm's stump never shows at the hollow's rim.
// With the hero near, the dead notice. Within AWARE tiles the hand turns its lean toward them
// and its fingers creep open; within REACH it strains out at them, splayed wide and trembling,
// and every CLUTCH seconds the claw snaps shut on the air and slowly prises open again. The
// idle moves keep going under it, fading out as it fixes on the hero. The alertness rises
// fast and fades slowly, so a hero who steps away leaves it groping for a moment.
// The scene is re-scanned twice a second; poses are functions of t (the alertness eases by
// the time since the last update), so it's frame-rate independent. A grave is terrain, not
// an item, so nothing here gives anything away.

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
  beckon: [[0, 0, 0, 0], [.25, -.3, .04, .03], [.9, .18, .06, .03], [1.0, .18, .06, .03], [1.3, -.25, .04, -.03], [1.95, .18, .06, -.03], [2.05, .18, .06, -.03], [2.35, -.25, .04, .03], [3.0, .18, .06, .03], [3.1, .18, .06, .03], [4.2, 0, 0, 0]],
  feel: [[0, 0, 0, 0], [.8, -.16, .06, .17], [1.0, -.08, .06, .17], [1.8, -.18, .05, -.17], [2.0, -.1, .05, -.17], [2.8, 0, 0, 0]],
};
// Hero sensing: the range it notices them (tiles), the range it reaches, how far it leans at
// full reach (rad, within HAND_TILT), the clutch period (s), and how fast alertness rises and
// fades (1/s).
export const AWARE = 3;
export const REACH = 1.5;
export const REACH_TILT = .18;
export const CLUTCH = 1.7;
export const ALERT_RISE = 4, ALERT_FALL = 1.2;
const KINDS = ['spasm', 'spasm', 'grasp', 'drum', 'feel', 'beckon'];

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

// How keen the hand should be at a hero distance (tiles): 0 beyond AWARE, 1 within REACH.
export function heroPull(dist) {
  if (!(dist < AWARE)) return 0;
  return smooth(Math.min(1, (AWARE - dist) / (AWARE - REACH)));
}

// The reach toward the hero at alertness `alert` (0..1), with (dx, dz) the unit direction to
// them in the hand's rest frame: {claw, x, z}. At low alertness it only leans a little and
// curls the fingers open; at full alertness it strains, trembles and clutches.
export function reachPose(t, alert, dx, dz, phase = 0) {
  if (!(alert > 0)) return {claw: 0, x: 0, z: 0};
  const strain = alert * alert;
  // the clutch: a snap shut over .12 s, held .25 s, then a slow prise open over the rest
  const u = ((t / CLUTCH + phase) % 1 + 1) % 1 * CLUTCH;
  const shut = u < .12 ? smooth(u / .12) : u < .37 ? 1 : 1 - smooth(Math.min(1, (u - .37) / (CLUTCH * .55)));
  const open = -.18 * alert - .34 * strain;
  const claw = open + (.16 - open) * shut * strain;
  // the lean, with a fine tremble while it strains and a jerk forward on each clutch
  const tremble = Math.sin(t * 31 + phase * 40) * .012 + Math.sin(t * 47 + phase * 17) * .007;
  const lean = Math.min(REACH_TILT, (.06 * alert + .1 * strain) + strain * (tremble + .02 * shut));
  return {claw, x: dz * lean, z: -dx * lean};
}

const mixPose = (a, b, k) => ({claw: a.claw + (b.claw - a.claw) * k, x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k});
function clampPose(p) {
  p.claw = Math.min(CLAW_RANGE[1], Math.max(CLAW_RANGE[0], p.claw));
  const tilt = Math.hypot(p.x, p.z);
  if (tilt > HAND_TILT) { p.x *= HAND_TILT / tilt; p.z *= HAND_TILT / tilt; }
  return p;
}

const e = new THREE.Euler(), q = new THREE.Quaternion(), qi = new THREE.Quaternion(), v = new THREE.Vector3();
// Where the hero is from a grave's hand: {dist (tiles), dx, dz (unit, in the hand's rest
// frame)}, or null. `heroWorld` is the hero's world position (or null).
export function heroFromHand(grave, heroWorld) {
  if (!heroWorld) return null;
  const {hand} = grave.userData;
  grave.updateWorldMatrix(true, false);
  v.copy(heroWorld);grave.worldToLocal(v).sub(hand.userData.rest.position);
  v.y = 0;
  const dist = v.length();
  v.applyQuaternion(qi.copy(hand.userData.rest.quaternion).invert());
  const len = Math.hypot(v.x, v.z);
  // Standing on the grave itself: no way to lean, so lean out toward the foot (+z).
  return len < 1e-6 ? {dist, dx: 0, dz: 1} : {dist, dx: v.x / len, dz: v.z / len};
}

// Pose a grave's hand at time t. `alert` (0..1) and `look` ({dx, dz}) add the reach toward
// the hero on top of the idle moves.
export function poseHand(grave, t, alert = 0, look = null) {
  const {hand, claw} = grave.userData;
  const phase = grave.userData.handPhase ?? 0;
  const idle = handPose(t, phase);
  const p = alert > 0 && look ? {...clampPose(mixPose(idle, reachPose(t, alert, look.dx, look.dz, phase), Math.min(1, alert * 1.5))), kind: idle.kind} : idle;
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
  let graves = [], nextScan = -Infinity, last = null;
  return {
    get graves() { return graves; },
    // `heroWorld`: the hero's world position, or null when there is no hero to see.
    update(t, heroWorld = null) {
      const dt = last == null ? 0 : Math.min(.25, Math.max(0, t - last));last = t;
      if (t >= nextScan || t < nextScan - HAND_SCAN_EVERY * 2) {
        graves = findRisenGraves(scene);
        for (const g of graves) g.userData.handPhase ??= phaseOf(g);
        nextScan = t + HAND_SCAN_EVERY;
      }
      for (const g of graves) {
        if (!g.visible) continue;
        const h = heroFromHand(g, heroWorld), want = h ? heroPull(h.dist) : 0;
        let a = g.userData.handAlert ?? 0;
        a += (want - a) * (1 - Math.exp(-dt * (want > a ? ALERT_RISE : ALERT_FALL)));
        if (a < 1e-3 && want === 0) a = 0;
        g.userData.handAlert = a;
        // keep leaning the last way it saw the hero while the alertness fades
        if (h) g.userData.handLook = {dx: h.dx, dz: h.dz};
        poseHand(g, t, a, g.userData.handLook);
      }
    },
  };
}
