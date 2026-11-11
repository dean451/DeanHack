// The rats' rest (enormous, giant, rabid and sewer rat): a brown rat's hunch, written by body role and solved on the
// joints `createRat` gives them (enormous-rat.js). A resting rat sits balled up rather than lying flat out: the belly
// low but the back still humped, all four feet tucked in under it, the head sunk low on the forepaws with the nose
// almost on the floor, and the tail swung off to one side and resting on the floor (it is one rigid mesh, not yet a
// chain, so its curled tip stays lifted; the chain is on the Claude list). A rat sleeps about half
// the day (CREATURE-MEASURES.md, Rats); no source gave a resting rat's angles, so the proportions are set by eye.
// A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation) and hipsY, the body's drop in body
// units, as the heavy quadrupeds' (quadruped-rest.js).
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {lowestOf} from './quadruped-rest.js';

// Shares of the rat's standing shoulder height: how near each forepaw tucks to its shoulder and each hind paw to
// its hip, how high the trunk's lowest point may still hang (the belly), how low the trunk's top must come down
// (the hunch is lower than standing but not flat), and how high the mouth may be (the nose sunk to the forepaws).
export const REST = {tuck: .5, belly: .2, back: .85, mouth: .5};

export const rests = a => !!(a && !a.asset && a.quirk === 'rat' && a.joints?.hips && a.joints.tail0 && a.joints.lleg0_2 && a.joints.rleg1_2);

// Sample points of the hide as posed (every fourth vertex): `bone` given, only those that hang mostly on it (the
// trunk alone, on `hips`); otherwise all of it, the legs merged into the same hide included.
const hideOf = (a, bone = null) => {
  let hide = null; a.body.traverse(o => { if (!hide && o.isSkinnedMesh && o.skeleton.bones.includes(a.joints.hips)) hide = o; });
  const k = bone ? hide.skeleton.bones.indexOf(bone) : -1, idx = hide.geometry.attributes.skinIndex, wt = hide.geometry.attributes.skinWeight, keep = [];
  for (let i = 0; i < idx.count; i += 4) if (k < 0) keep.push(i); else for (let c = 0; c < 4; c++) if (idx.getComponent(i, c) === k && wt.getComponent(i, c) > .5) { keep.push(i); break; }
  const v = new THREE.Vector3();
  return () => { a.g.updateMatrixWorld(true); hide.skeleton.update(); return keep.map(i => hide.getVertexPosition(i, v).applyMatrix4(hide.matrixWorld).clone()); };
};

// Solves the hunch (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const high = P['shoulder:l']().y - floor, trunk = hideOf(a, j.hips), hide = hideOf(a);
  const top = Math.max(...trunk().map(p => p.y)) - floor;
  const joints = {hipsY: [-1.5, 0], 'neck0.x': [-.4, 1.2], 'tail0.x': [-1.2, 1.2], 'tail0.y': [-1, 1]};
  for (const side of ['l', 'r']) for (const i of [0, 1]) for (const b of ['', '_1', '_2']) joints[`${side}leg${i}${b}.x`] = [-2.6, 2.6];
  const low = () => Math.min(...trunk().map(p => p.y)), back = () => Math.max(...trunk().map(p => p.y));
  const goals = [
    // the belly down near the floor, and the humped back lower than standing
    () => [3 * Math.max(0, low() - (floor + REST.belly * high))],
    () => [2 * Math.max(0, back() - (floor + REST.back * top))],
  ];
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}f`, {y: floor, weight: 2}), goal.floor(`paw:${side}h`, {y: floor, weight: 2}),
      goal.reach(`paw:${side}f`, `shoulder:${side}`, {within: REST.tuck * high, weight: 1.5}),
      goal.reach(`paw:${side}h`, `hip:${side}`, {within: REST.tuck * high, weight: 1.5}));
  }
  // the nose sunk low over the forepaws, the tail's lowest point resting on the floor
  goals.push(goal.below('mouth', floor + REST.mouth * high, {weight: 2}), goal.rests(lowestOf(j.tail0), {y: floor, weight: 2}));
  // nothing through the floor: the hide (trunk and legs) and the head (the tail rests on it, above)
  goals.push(goal.clear(hide, {y: floor - .004 * s, weight: 2}), goal.clear(lowestOf(j.head), {y: floor - .004 * s}));
  // starting folds: the elbows and knees bent either way, the feet laid flat, toed down or toed up
  const fold = (k, f) => { const b = {hipsY: -.08, neck0: {x: .5}, tail0: {x: .4, y: .5}}; for (const side of ['l', 'r']) { b[`${side}leg0`] = {x: 1.6 * k}; b[`${side}leg0_1`] = {x: -1.8 * k}; b[`${side}leg0_2`] = {x: f}; b[`${side}leg1`] = {x: -1.4 * k}; b[`${side}leg1_1`] = {x: 2 * k}; b[`${side}leg1_2`] = {x: -f}; } return b; };
  let out = null;
  for (const base of [1, -1].flatMap(k => [0, .6, -.6].map(f => fold(k, f)))) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 500, rest: .01});
    if (!out || Math.max(...t.residuals.flat().map(Math.abs)) < Math.max(...out.residuals.flat().map(Math.abs))) out = t;
  }
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, high, top};
}
