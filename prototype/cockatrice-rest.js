// The resting cockerel (chickatrice, cockatrice, pyrolisk): a hen on her breast, written by body role and
// solved on the joints `cockatrice()` exposes, from the fowl measures in creature-measures.js (a hen lies
// prone for most of the night). The breast comes down on the floor, the feet fold up under it out of sight,
// the head is tucked back on its neck chain with the beak over the left wing (as a hen sleeps), the wings draw
// in against the sides and the tail trails on the floor. A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation) and hipsY, the
// body's drop in body units.
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import * as THREE from 'three';

// Sizes in the bird's own units (times its scale): the breast's lowest point above the body origin, how high
// the beak rests over the floor, how close a folded foot lies to the breast's lowest point (the feet are built .23 out of the midline, so each leg also swings in), how close a folded
// wing tip lies to the haunch, how high the tail tip trails over the floor, how far forward of the body's origin the
// tucked head may sit (behind the breast's front), where the tucked beak nestles (the feathers on the left of the
// back, over the wing's shoulder) and how close to it.
export const REST = {breast: .078, beak: .075, foot: .17, wingIn: .06, tail: .07, tuck: .12, under: .04, nestle: [-.1, .17, .02]};

const AXES = ['x', 'y', 'z'];

// Poses an actor from a pose. The built rotations are read once per actor, so a poser made on a posed bird
// still knows its rest.
export function birdPoser(a) {
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  const {rest, body} = a.jointRest;
  const apply = pose => {
    for (const [n, o] of Object.entries(a.joints)) { const r = rest[n], p = pose[n] || {}; o.rotation.set(r.x + (p.x || 0), r.y + (p.y || 0), r.z + (p.z || 0)); }
    a.body.position.set(body.x, body.y + (pose.hipsY || 0), body.z);
    a.g.updateMatrixWorld(true);
  };
  return {apply, rest};
}

// Solves the resting pose for an actor (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const breast = () => { const p = new THREE.Vector3(0, REST.breast, 0); return a.body.localToWorld(p); };
  const hips = [['l', 'h'], ['r', 'h'], ['l', 'f'], ['r', 'f']];
  const joints = {hipsY: [-.2, 0], 'tail0.x': [-.8, .8]};
  for (const n of ['neck0', 'neck1', 'neck2', 'neck3']) { joints[`${n}.x`] = [-1, 1]; joints[`${n}.y`] = [-1.1, 1.1]; }
  for (const side of ['l', 'r']) {
    for (const i of [0, 1]) { joints[`${side}leg${i}.x`] = [-2.6, 2.6]; joints[`${side}leg${i}.z`] = [-1.2, 1.2]; }
    joints[`${side}wing.y`] = [-1.6, 1.6]; joints[`${side}wing.z`] = [-.6, .6];
  }
  const goals = [goal.floor(breast, {y: floor, weight: 3})];
  for (const [side, pair] of hips) goals.push(goal.reach(`paw:${side}${pair}`, breast, {within: REST.foot * s}), goal.above(`paw:${side}${pair}`, floor + .012 * s, {weight: 2}));
  // nothing of a leg or the tail (toes, claws, plumes) goes through the floor: the lowest point of each, from its bounds
  const lowest = group => () => { const b = new THREE.Box3().setFromObject(group); return [new THREE.Vector3(0, b.min.y, 0)]; };
  for (const name of Object.keys(j).filter(n => /leg\d|^tail0|^head/.test(n))) goals.push(goal.clear(lowest(j[name]), {y: floor}));
  // the head tucked back as a hen sleeps on the perch: the head drawn in behind the breast's front, the beak turned
  // back into the feathers on the left of the back, over the wing's shoulder (REST.nestle, the bird's own space)
  const inBody = p => a.body.worldToLocal(p.clone()), nestle = () => a.body.localToWorld(new THREE.Vector3(...REST.nestle));
  goals.push(P => [2 * Math.max(0, inBody(P.head()).z - REST.tuck)], goal.reach('mouth', nestle, {within: REST.under * s, weight: 2}),
    goal.above('mouth', floor + REST.beak * s), goal.floor('tailtip', {y: floor + REST.tail * s}));
  for (const side of ['l', 'r']) goals.push(goal.reach(`wingtip:${side}`, `hip:${side}`, {within: REST.wingIn * s}));
  // (the legs start from a fold: the forelegs swung back and in, the hind legs forward and in, or they settle
  // with a foot through the floor)
  const base = {hipsY: -.07};
  for (const [side, k] of [['l', 1], ['r', -1]]) { base[`${side}leg0`] = {x: 1.5, z: .4 * k}; base[`${side}leg1`] = {x: -.8, z: .4 * k}; base[`${side}wing`] = {y: -.87 * k}; }
  // (the neck starts already turned back to the left, the way the head goes under the wing)
  for (const n of ['neck1', 'neck2', 'neck3']) base[n] = {y: -.9, x: .2};
  const out = solvePose({joints, base, goals, apply, points: P, iterations: 300, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, breast, goals};
}
