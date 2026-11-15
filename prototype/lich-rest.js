// The resting lich (family L, stage 4, step 1): a wasted, rigid man standing in his stoop, written by body role and
// solved on the joints `lich()` rigs (`hips` at the floor, `spine0` the waist, `spine1` the chest, `neck0`..`neck3`,
// three-bone arms). CREATURE-MEASURES.md (Liches) gives the shape: bent forward at least 30 degrees from the hips
// (camptocormia's lower bend, LICH.stoop; the lich has no legs, so its "hips" are the waist, where the robe bends),
// the arms hanging, the hands trembling (the tremor is motion, for stage 5). The free (left) hand hangs straight
// under its shoulder; the right keeps its grip on the staff, which stays planted on the floor, so the lich stoops
// over it like an old man over a stick. The skull rides the bent chest unturned, peering at the floor ahead: its face
// sits only just out of the hood (which rides the chest), and the neck is a few centimetres long, so lifting the head
// back would bury the face in the hood. A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation),
// as humanoid-rest.js.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {LICH} from './creature-measures.js';

// stoop: the trunk's forward bend from upright (rad); chest: the most the chest bone may add to the waist's bend
// (rad), so the bend stays low, at the hips.
export const REST = {stoop: LICH.stoop, chest: .25};

export const rests = a => !!(a?.lichHands && a.joints?.hips && a.joints.spine0 && a.joints.spine1 && a.joints.neck3 && a.joints.lfore_2 && a.joints.rfore_2 && a.joints.jaw);

// Solves the stoop (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, {apply} = birdPoser(a);
  apply({});
  const rump = P.rump().clone(), withers = P.withers().clone(), trunk = withers.distanceTo(rump);
  // the stoop's line: the waist-to-neck line leaned forward (+z) by the stoop from straight up
  const bent = rump.clone().add(new THREE.Vector3(0, Math.cos(REST.stoop), Math.sin(REST.stoop)).multiplyScalar(trunk));
  const arm = P['shoulder:l']().distanceTo(P['paw:lf']()), grip = P['paw:rf']().clone();
  const joints = {'spine0.x': [0, 1.2], 'spine1.x': [-.1, REST.chest]};
  for (const side of ['l', 'r']) {
    for (const ax of ['x', 'y', 'z']) joints[`${side}fore_0.${ax}`] = [-2.5, 2.5];
    joints[`${side}fore_1.x`] = [-2, 2];
  }
  const goals = [
    // the stoop: the neck's root on the leaned line over the waist
    goal.reach('withers', () => bent, {within: .005 * s, weight: 3}),
    // the free hand hangs straight down under its shoulder, at the arm's standing reach
    goal.reach('paw:lf', () => P['shoulder:l']().clone().add(new THREE.Vector3(0, -arm, 0)), {within: .01 * s, weight: 2}),
    // the staff hand keeps its grip where it stood: the staff does not move
    goal.reach('paw:rf', () => grip, {within: .005 * s, weight: 3}),
  ];
  const r = solvePose({joints, base: {spine0: {x: REST.stoop}}, goals, apply, points: P, iterations: 800, rest: .01});
  apply({});
  return {pose: r.pose, residuals: r.residuals, goals, trunk, arm, grip, bent, rump};
}
