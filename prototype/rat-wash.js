// The rats' face wash (enormous, giant, rabid and sewer rat): a brown rat's signature display, written by body role
// and solved on the joints `createRat` gives them (enormous-rat.js), as the hunched rest (rat-rest.js). A rat that
// washes sits back on its haunches, the trunk reared up off the forepaws, and brings both forepaws together to the
// nose; the chain's first phase is small strokes tight round the nose (Berridge, Fentress and Parr 1987:
// CREATURE-MEASURES.md, Rats). Reared up, the rat stands much taller than on all fours with its forepaws off the floor,
// the one readable silhouette change from the game camera. No source gave the sit-up's angles, so its shares are set
// by eye. A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation), hipsY and hipsZ, the body's
// shift in body units, and body: {x}, the whole body's pitch (negative rears the front up); `washPoser` applies it.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {lowestOf} from './quadruped-rest.js';
import {rests} from './rat-rest.js';

// Shares of the rat's standing shoulder height: how high the withers rise at least (standing they are about 1.6),
// how low the trunk's lowest point sits (on its haunches), how near each forepaw comes to the mouth, how high the
// forepaws are held off the floor at least, and how far each hind paw may lie from its hip. `rise` is the trunk's
// slope from rump to withers in degrees, give or take `slack`.
export const WASH = {up: 2.8, seat: .25, paw: .3, lift: .9, tuck: 1, rise: 65, slack: 10};

export const washes = rests;

// Applies a wash pose: the joints and the body's drop as birdPoser does, then the body's pitch and its slide along z.
export function washPoser(a) {
  const bird = birdPoser(a);
  if (!a.jointRest.pitch) a.jointRest.pitch = {x: a.body.rotation.x};
  const {pitch, body} = a.jointRest;
  const apply = pose => {
    bird.apply(pose);
    a.body.rotation.x = pitch.x + (pose.body?.x || 0);
    a.body.position.z = body.z + (pose.hipsZ || 0);
    a.g.updateMatrixWorld(true);
  };
  return {apply, rest: bird.rest};
}

// Sample points of the hide as posed (every fourth vertex): `bone` given, only those that hang mostly on it.
const hideOf = (a, bone = null) => {
  let hide = null; a.body.traverse(o => { if (!hide && o.isSkinnedMesh && o.skeleton.bones.includes(a.joints.hips)) hide = o; });
  const k = bone ? hide.skeleton.bones.indexOf(bone) : -1, idx = hide.geometry.attributes.skinIndex, wt = hide.geometry.attributes.skinWeight, keep = [];
  for (let i = 0; i < idx.count; i += 4) if (k < 0) keep.push(i); else for (let c = 0; c < 4; c++) if (idx.getComponent(i, c) === k && wt.getComponent(i, c) > .5) { keep.push(i); break; }
  const v = new THREE.Vector3();
  return () => { a.g.updateMatrixWorld(true); hide.skeleton.update(); return keep.map(i => hide.getVertexPosition(i, v).applyMatrix4(hide.matrixWorld).clone()); };
};

const worst = r => Math.max(...r.residuals.flat().map(Math.abs));

// Solves the wash (the built pose is left as it was found).
export function washPose(a) {
  const {apply} = washPoser(a);
  apply({});
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints;
  const high = P['shoulder:l']().y - floor, trunk = hideOf(a, j.hips), hide = hideOf(a);
  const joints = {'body.x': [-1.5, 0], hipsY: [-.5, 1], hipsZ: [-.6, .6], 'neck0.x': [-.6, 1.4], 'tail0.x': [-2, 2], 'tail0.y': [-1.2, 1.2]};
  for (const side of ['l', 'r']) {
    for (const i of [0, 1]) for (const b of ['', '_1', '_2']) joints[`${side}leg${i}${b}.x`] = [-2.8, 2.8];
    joints[`${side}leg0.z`] = [-.9, .9];
  }
  const low = () => Math.min(...trunk().map(p => p.y));
  const goals = [
    // sat back on its haunches, the trunk reared up and the withers high
    () => [3 * Math.max(0, low() - (floor + WASH.seat * high))],
    goal.above('withers', floor + WASH.up * high, {weight: 2}),
    goal.slope('rump', 'withers', WASH.rise, {slack: WASH.slack, weight: 2}),
  ];
  for (const side of ['l', 'r']) {
    // the hind feet flat on the floor under the hips; the forepaws off it, together at the nose
    goals.push(goal.floor(`paw:${side}h`, {y: floor, weight: 2}), goal.reach(`paw:${side}h`, `hip:${side}`, {within: WASH.tuck * high, weight: 1.5}),
      goal.reach(`paw:${side}f`, 'mouth', {within: WASH.paw * high, weight: 2}), goal.above(`paw:${side}f`, floor + WASH.lift * high, {weight: 2}));
  }
  // the tail's lowest point on the floor and its tip behind the rump; nothing of the hide or the head through the floor
  goals.push(goal.rests(lowestOf(j.tail0), {y: floor, weight: 2}), P => [2 * Math.max(0, P.tailtip().z - P.rump().z)], goal.clear(hide, {y: floor - .004 * s, weight: 2}), goal.clear(lowestOf(j.head), {y: floor - .004 * s}));
  // starting points: the body reared a little or a lot, the forelegs swung up ahead, the hind legs folded, the tail
  // held low or lifted against the rear
  const start = (pitch, k, tail) => {
    const b = {body: {x: pitch}, hipsY: .1, neck0: {x: .6}, tail0: {x: tail}};
    for (const side of ['l', 'r']) { b[`${side}leg0`] = {x: -1.2 * k}; b[`${side}leg0_1`] = {x: 1.4}; b[`${side}leg1`] = {x: -pitch - .6}; b[`${side}leg1_1`] = {x: 1.2}; b[`${side}leg1_2`] = {x: -.6}; }
    return b;
  };
  let out = null;
  for (const base of [.3, .9].flatMap(t => [-.6, -.9, -1.1].flatMap(p => [1, .5].map(k => start(p, k, t))))) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 400, rest: .01});
    if (!out || worst(t) < worst(out)) out = t;
    if (worst(out) < .01) break;
  }
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, high};
}
