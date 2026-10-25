// The ant's defence, from the AntWiki reference (CREATURE-MEASURES.md, Insects): the gaster is lifted and flexed
// forward over the back until the sting points over the head. Written by body role, solved on the joints
// `insectRoles` reads, standing as built: the six feet stay planted, only the gaster (`tail0`) and the body's
// height move. A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation) and hipsY.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Where the sting ends up: at least this far over the withers in the creature's own units (times its scale), and this
// share of the way from the rump to the withers (so it points over the back, not behind it)
export const GASTER = {lift: .12, forward: .8};

const PAWS = ['paw:lf', 'paw:rf', 'paw:lm', 'paw:rm', 'paw:lh', 'paw:rh'];

export const raises = a => !!(a && !a.asset && a.quirk === 'insect' && a.joints?.lleg0_2 && a.antJaws);

// Solves the raised-gaster pose for an ant (the built pose is left as it was found).
export function gasterPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, {apply} = birdPoser(a);
  const forward = P2 => { const r = P2.rump(), w = P2.withers(), z = r.z + GASTER.forward * (w.z - r.z); return [Math.max(0, z - P2.tailtip().z)]; };
  const joints = {'tail0.x': [-2.6, 2.6]};
  const goals = PAWS.map(p => goal.floor(p, {y: floor + (P[p]().y - floor), weight: 2}));
  goals.push(goal.above('tailtip', P.withers().y + GASTER.lift * s, {weight: 2}), forward);
  const out = solvePose({joints, goals, apply, points: P, iterations: 200, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals};
}
