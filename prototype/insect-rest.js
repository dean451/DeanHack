// The resting ant, beetle and locust: written by body role and solved on the joints `insectRoles` reads.
// No source gave a resting ant's posture (CREATURE-MEASURES.md, Insects), so this is the posture in words,
// set by eye: the six feet stay planted, the legs fold so the body settles low on them, the head droops and
// the abdomen (the gaster, the sting) sinks to the floor behind. A pose is {joint: {x, y, z}} (radians,
// added to the joint's built rotation) and hipsY, the body's drop in body units.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the built height of the rump over the floor and sizes in the creature's own units (times its scale):
// how low the body settles, how far the mouth drops, how high the abdomen's underside rests over the floor, and how
// high the feet's soles stand.
export const REST = {body: .62, mouth: .04, tail: .012, foot: .004};

const PAWS = ['paw:lf', 'paw:rf', 'paw:lm', 'paw:rm', 'paw:lh', 'paw:rh'];

export const rests = a => !!(a && !a.asset && a.quirk === 'insect' && a.joints?.lleg0_2);

// Solves the resting pose for an ant, beetle or locust (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const high = P.rump().y - floor, mouth0 = P.mouth().y;
  const joints = {hipsY: [-.2, 0], 'neck0.x': [-.2, 1], 'tail0.x': [-.8, .8]};
  for (const side of ['l', 'r']) for (const i of [0, 1, 2]) { joints[`${side}leg${i}.x`] = [-1.3, 1.3]; joints[`${side}leg${i}.z`] = [-.8, .8]; }
  const goals = [];
  for (const p of PAWS) goals.push(goal.floor(p, {y: floor + REST.foot * s, weight: 2}));
  // the body settles: the rump comes down to a share of its built height
  goals.push(P2 => [Math.max(0, P2.rump().y - floor - REST.body * high)]);
  // the head droops
  goals.push(P2 => [Math.max(0, P2.mouth().y - (mouth0 - REST.mouth * s))]);
  // the abdomen sinks until its underside rests on the floor, and the head stays off it (the lowest point of each, from its bounds)
  const lowest = group => () => { const b = new THREE.Box3().setFromObject(group); return [new THREE.Vector3(0, b.min.y, 0)]; };
  goals.push(goal.rests(lowest(j.tail0), {y: floor + REST.tail * s}), goal.clear(lowest(j.head), {y: floor}));
  const out = solvePose({joints, goals, apply, points: P, iterations: 200, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals};
}
