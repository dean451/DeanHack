// The dwarf's brace: feet wide apart and planted, knees bent, the body dropped and leaned into whatever comes, both
// hands out in front at chest height. Written by body role and solved on the joints `rigHumanoid` exposes, like the
// slumped sit (humanoid-rest.js). No source gave a braced stance as an angle (CREATURE-MEASURES.md, Humanoids: the
// wide stance has no source), so its proportions are set by eye. A pose is {joint: {x, y, z}} (radians, added to the
// joint's built rotation) and hipsY, the body's drop in body units.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the creature's standing hip height: how far apart the feet end up (at least), how low the pelvis sinks
// (highest allowed), how far the chest leans ahead of the pelvis (at least) and how far the hands reach ahead of the
// shoulders (at least).
export const BRACE = {stance: .75, drop: .8, lean: .1, reach: .35};

// Only the dwarves brace; the hobbit and the bugbear have their own manners (what is left of stage 4).
export const braces = a => !!(a && a.quirk === 'dwarf' && a.joints?.rfore_2 && a.joints.lleg1_2 && a.joints.spine1 && a.joints.neck3);

// Solves the brace (the built pose is left as it was found).
export function bracePose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, {apply} = birdPoser(a);
  const stand = P.rump().y - floor, joints = {hipsY: [-1, 0]};
  for (const n of ['spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-.9, .9];
  for (const side of ['l', 'r']) {
    for (const i of [0, 1, 2]) joints[`${side}leg1_${i}.x`] = [-2.4, 2.4];
    joints[`${side}leg1_0.z`] = [-1, 1];
    for (const i of [0, 1]) { joints[`${side}fore_${i}.x`] = [-2.6, 2.6]; joints[`${side}fore_${i}.z`] = [-.8, .8]; }
  }
  const goals = [goal.below('rump', floor + BRACE.drop * stand, {weight: 3}), goal.ahead('rump', 'withers', BRACE.lean * stand, {within: .04 * s})];
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}h`, {y: floor, weight: 3}));
    // each heel stands out from the pelvis by half the stance, so the legs spread alike
    goals.push(Q => [3 * Math.max(0, BRACE.stance * stand / 2 - Math.abs(Q[`paw:${side}h`]().x - Q.rump().x))]);
    goals.push(goal.ahead(`shoulder:${side}`, `paw:${side}f`, BRACE.reach * stand, {within: .05 * s}), goal.below(`paw:${side}f`, floor + .9 * (P.withers().y - floor), {weight: 1}));
  }
  const skins = [], v = new THREE.Vector3();
  a.g.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
  goals.push(goal.clear(() => { const out = []; for (const m of skins) { m.updateMatrixWorld(true); m.skeleton.update(); for (let i = 0; i < m.geometry.attributes.position.count; i += 5) out.push(m.getVertexPosition(i, v).clone().applyMatrix4(m.matrixWorld)); } return out; }, {y: floor - .008 * s, weight: 2}));
  const out = solvePose({joints, base: {hipsY: -.15 * stand / s, lleg1_0: {x: -.5}, rleg1_0: {x: -.5}, lleg1_1: {x: .8}, rleg1_1: {x: .8}}, goals, apply, points: P, iterations: 1500, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, stand};
}
