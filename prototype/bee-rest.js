// The resting honeybee (killer bee, queen bee): written by body role and solved on the joints `createBee()`
// exposes, from the honeybee's sleep in creature-measures.js (INSECTS: the head lowered, the bee still).
// A bee hovers when it is built, its six feet hanging well above the floor; resting, it lands: the body comes
// down until the feet stand on the floor, the head droops to the mouth's lowest, and the wings fold back
// along the abdomen. A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation) and hipsY,
// the body's drop in body units. The antennae are part of the head's one mesh, so they drop with it.
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Sizes in the bee's own units (times its scale): how far the mouth hangs under the head's pivot, how close a
// folded wing tip lies to the midline, how far a wing tip trails behind the waist, and how high the feet's
// soles stand over the floor.
export const REST = {mouth: .1, wingIn: .04, wingBack: .1, foot: .004};

const PAWS = ['paw:lf', 'paw:rf', 'paw:lm', 'paw:rm', 'paw:lh', 'paw:rh'];

export const rests = a => !!(a && !a.asset && a.quirk === 'bee' && a.joints?.lleg0_2);

// Solves the resting pose for a bee (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const joints = {hipsY: [-1.2, 0], 'neck0.x': [-.2, 1.2], 'tail0.x': [-.5, .5]};
  for (const side of ['l', 'r']) for (const i of [0, 1, 2]) { joints[`${side}leg${i}.x`] = [-1.3, 1.3]; joints[`${side}leg${i}.z`] = [-.8, .8]; }
  for (const side of ['l', 'r']) { joints[`${side}wing.y`] = [-2, 2]; joints[`${side}wing.z`] = [-1.6, 1.6]; }
  const goals = [];
  for (const p of PAWS) goals.push(goal.floor(p, {y: floor + REST.foot * s, weight: 2}));
  // the head droops: the mouth hangs well under the pivot it turns about
  goals.push(P2 => [Math.max(0, REST.mouth * s - (P2.head().y - P2.mouth().y))]);
  for (const side of ['l', 'r']) {
    const sign = side === 'l' ? -1 : 1, tip = P2 => P2[`wingtip:${side}`]();
    // each wing tip comes in toward the midline (still on its own side) and back past the waist, lying along the abdomen
    goals.push(P2 => [Math.max(0, sign * tip(P2).x - REST.wingIn * s) + Math.max(0, .005 * s - sign * tip(P2).x)]);
    goals.push(P2 => [Math.max(0, tip(P2).z - (P2.rump().z - REST.wingBack * s))]);
    goals.push(P2 => [Math.max(0, tip(P2).y - P2.rump().y - .04 * s) + Math.max(0, P2.rump().y - tip(P2).y)]);
  }
  const out = solvePose({joints, goals, apply, points: P, iterations: 200, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals};
}
