// The cockerel's crow (chickatrice, cockatrice, pyrolisk), written by body role and solved on the joints
// `cockatrice()` exposes, from the fowl measures in creature-measures.js (a crow lasts 1.5 to 1.9 s): standing on
// both feet, the beak thrown up past the withers, the wings flung up from the sides, the tail cocked. Only
// the neck, wings and tail turn; the four feet stay where they stood. A pose is {joint: {x, y, z}} (radians, added
// to the joint's built rotation) and hipsY.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {FOWL} from './creature-measures.js';

// How the crow stands, in the bird's own units (times its scale): the beak over the withers, each wing tip over
// the withers, the tail tip over the rump (the wing hinges on the body's axis, so lifting it also swings it out). `seconds` is the middle of the measured crow.
export const CROW = {beak: .13, wingUp: .06, tail: .1, seconds: (FOWL.crowSeconds[0] + FOWL.crowSeconds[1]) / 2};

const PAWS = ['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh'];

export const crows = a => !!(a && !a.asset && a.quirk === 'cockatrice' && a.joints?.neck0 && a.joints.lwing);

// Solves the crowing pose (the built pose is left as it was found).
export function crowPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, {apply} = birdPoser(a);
  const joints = {'neck0.x': [-1.4, .6], 'tail0.x': [-.8, .8]};
  for (const side of ['l', 'r']) { joints[`${side}wing.y`] = [-1.6, 1.6]; joints[`${side}wing.z`] = [-1.6, 1.6]; }
  const goals = PAWS.map(p => goal.floor(p, {y: floor + (P[p]().y - floor), weight: 2}));
  goals.push(goal.above('mouth', P.withers().y + CROW.beak * s, {weight: 2}), goal.above('tailtip', P.rump().y + CROW.tail * s));
  for (const side of ['l', 'r']) {
    goals.push(goal.above(`wingtip:${side}`, P.withers().y + CROW.wingUp * s));
  }
  const out = solvePose({joints, goals, apply, points: P, iterations: 160, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals};
}
