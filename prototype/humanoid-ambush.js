// The bugbear's ambush: a low crouch on bent legs, the chest pitched hard forward over the knees, the head kept up and
// level on the prey, both hands low and out ahead, ready to spring. Written by body role and solved on the joints
// `rigHumanoid` exposes, like the dwarf's brace (humanoid-brace.js). No source gave an ambush crouch as an angle
// (CREATURE-MEASURES.md, Humanoids), so its proportions are set by eye. A pose is {joint: {x, y, z}} (radians, added
// to the joint's built rotation) and hipsY, the body's drop in body units.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the creature's standing hip height: how far the feet are apart (at most, the stance stays narrow), how low
// the pelvis sinks (highest allowed), how far the chest leans ahead of the pelvis (at least) and how far the hands reach
// ahead of the shoulders (at least).
export const AMBUSH = {stance: .6, drop: .88, lean: .25, reach: .3};

// Only the bugbear ambushes; the dwarves brace and the hobbit sits.
export const ambushes = a => !!(a && a.g?.name === 'bugbear' && a.joints?.rfore_2 && a.joints.lleg1_2 && a.joints.spine1 && a.joints.neck3);

// Solves the ambush (the built pose is left as it was found).
export function ambushPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, {apply} = birdPoser(a);
  const stand = P.rump().y - floor, joints = {hipsY: [-1, 0]};
  for (const n of ['spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-.9, .9];
  for (const side of ['l', 'r']) {
    for (const i of [0, 1, 2]) joints[`${side}leg1_${i}.x`] = [-2.4, 2.4];
    joints[`${side}leg1_0.z`] = [-1, 1];
    for (const i of [0, 1]) { joints[`${side}fore_${i}.x`] = [-2.6, 2.6]; joints[`${side}fore_${i}.z`] = [-.8, .8]; }
  }
  const goals = [goal.below('rump', floor + AMBUSH.drop * stand, {weight: 3}), goal.ahead('rump', 'withers', AMBUSH.lean * stand, {within: .04 * s})];
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}h`, {y: floor, weight: 3}));
    // the feet stay close under the pelvis
    goals.push(Q => [3 * Math.max(0, Math.abs(Q[`paw:${side}h`]().x - Q.rump().x) - AMBUSH.stance * stand / 2)]);
    goals.push(goal.ahead(`shoulder:${side}`, `paw:${side}f`, AMBUSH.reach * stand, {within: .05 * s}), goal.below(`paw:${side}f`, floor + .8 * (P.withers().y - floor), {weight: 1}));
  }
  const skins = [], v = new THREE.Vector3();
  a.g.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
  goals.push(goal.clear(() => { const out = []; for (const m of skins) { m.updateMatrixWorld(true); m.skeleton.update(); for (let i = 0; i < m.geometry.attributes.position.count; i += 5) out.push(m.getVertexPosition(i, v).clone().applyMatrix4(m.matrixWorld)); } return out; }, {y: floor - .008 * s, weight: 2}));
  const out = solvePose({joints, base: {hipsY: -.12 * stand / s, lleg1_0: {x: -.6}, rleg1_0: {x: -.6}, lleg1_1: {x: 1}, rleg1_1: {x: 1}}, goals, apply, points: P, iterations: 1500, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, stand};
}
